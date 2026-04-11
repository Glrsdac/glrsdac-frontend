import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const resolveFundSplitPercentages = (fund) => {
  const conference = Number(fund?.conference_percentage ?? 0) || 0;
  const district = Number(fund?.district_percentage ?? 0) || 0;
  const local = Number(fund?.local_percentage ?? 0) || 0;

  const total = conference + district + local;

  if (total < 100) {
    return { conference, district: district + (100 - total), local };
  }

  if (total > 100 && total > 0) {
    const factor = 100 / total;
    return {
      conference: conference * factor,
      district: district * factor,
      local: local * factor,
    };
  }

  return { conference, district, local };
};

const insertContributionWithSchemaFallback = async (payload) => {
  let attemptPayload = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from("contributions").insert(attemptPayload).select("id, fund_id, amount, conference_portion, district_portion, local_portion").single();
    if (!result.error) return result;

    const message = String(result.error.message || "");
    const code = String(result.error.code || "").toUpperCase();
    const missingColumnMatch = message.match(/Could not find the '([^']+)' column/i);
    const missingColumn = missingColumnMatch?.[1];

    const isMissingColumn = code === "PGRST204" || /Could not find the/i.test(message);
    if (!isMissingColumn || !missingColumn || !(missingColumn in attemptPayload)) {
      return result;
    }

    delete attemptPayload[missingColumn];
  }

  return { error: new Error("Exceeded schema fallback attempts") };
};

const main = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: openAccounts, error: openAccountError } = await supabase
    .from("sabbath_accounts")
    .select("id, week_start, week_end, status")
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1);

  if (openAccountError) {
    throw new Error(`Failed loading open sabbath account: ${openAccountError.message}`);
  }

  const account = openAccounts?.[0];
  if (!account) {
    throw new Error("No OPEN sabbath_account found. Open a Sabbath session first.");
  }

  const { data: funds, error: fundsError } = await supabase
    .from("funds")
    .select("id, name, conference_percentage, district_percentage, local_percentage")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (fundsError) {
    throw new Error(`Failed loading funds: ${fundsError.message}`);
  }

  if (!funds?.length) {
    throw new Error("No active funds found.");
  }

  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("status", "ACTIVE")
    .limit(1);

  const memberId = members?.[0]?.id ?? null;

  console.log(`Testing contributions insert on OPEN sabbath_account ${account.id} for ${funds.length} fund(s)...`);

  const results = [];

  for (let index = 0; index < funds.length; index += 1) {
    const fund = funds[index];
    const amount = 10 + index;
    const split = resolveFundSplitPercentages(fund);

    const payload = {
      amount,
      amount_original: amount,
      currency_code: "GHS",
      exchange_rate_to_ghs: 1,
      fund_id: fund.id,
      member_id: memberId,
      payment_method: "CASH",
      sabbath_account_id: account.id,
      service_date: today,
      conference_portion: (amount * split.conference) / 100,
      district_portion: (amount * split.district) / 100,
      local_portion: (amount * split.local) / 100,
      contribution_day: null,
      recorded_by: "TERMINAL_TEST",
    };

    const inserted = await insertContributionWithSchemaFallback(payload);

    if (inserted.error) {
      results.push({
        fund: fund.name,
        status: "FAILED",
        error: inserted.error.message,
      });
      continue;
    }

    results.push({
      fund: fund.name,
      status: "OK",
      id: inserted.data.id,
      amount: inserted.data.amount,
      conf: inserted.data.conference_portion,
      district: inserted.data.district_portion,
      local: inserted.data.local_portion,
      expectedPct: split,
    });
  }

  console.table(
    results.map((r) => ({
      fund: r.fund,
      status: r.status,
      id: r.id ?? "-",
      amount: r.amount ?? "-",
      conf: r.conf ?? "-",
      district: r.district ?? "-",
      local: r.local ?? "-",
      expected_conf_pct: r.expectedPct?.conference?.toFixed?.(2) ?? "-",
      expected_district_pct: r.expectedPct?.district?.toFixed?.(2) ?? "-",
      expected_local_pct: r.expectedPct?.local?.toFixed?.(2) ?? "-",
      error: r.error ?? "",
    }))
  );

  const failed = results.filter((r) => r.status !== "OK");
  if (failed.length > 0) {
    process.exitCode = 1;
    console.error(`Completed with ${failed.length} failure(s).`);
  } else {
    console.log("All fund contribution test inserts completed successfully.");
  }
};

main().catch((error) => {
  console.error("Test failed:", error.message || error);
  process.exit(1);
});
