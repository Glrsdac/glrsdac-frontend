import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in environment.");
  process.exit(1);
}

const MARKER = "SEED_FEB_2026";
const TARGET_MEMBER_COUNT = 50;
const TARGET_CONTRIBUTIONS = 200;

const februaryWeeks = [
  { weekStart: "2026-02-07", weekEnd: "2026-02-13" },
  { weekStart: "2026-02-14", weekEnd: "2026-02-20" },
  { weekStart: "2026-02-21", weekEnd: "2026-02-27" },
  { weekStart: "2026-02-28", weekEnd: "2026-03-06" },
];

const toFixed2 = (n) => Number(n.toFixed(2));

const isDaybornFundName = (name) => {
  const normalized = String(name || "").toLowerCase();
  return normalized.includes("day born") || normalized.includes("dayborn");
};

const resolveFundSplitPercentages = (fund) => {
  if (isDaybornFundName(fund?.name)) {
    return { conference: 0, district: 0, local: 100 };
  }

  const conference = Number(fund.conference_percentage ?? 0) || 0;
  const district = Number(fund.district_percentage ?? 0) || 0;
  const local = Number(fund.local_percentage ?? 0) || 0;

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

const addDays = (yyyyMmDd, daysToAdd) => {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
};

async function ensureSeedMembers(client) {
  const { rows: activeMembers } = await client.query(
    `SELECT id, first_name, last_name, dob
     FROM public.members
     WHERE status = 'ACTIVE'
     ORDER BY id ASC`
  );

  if (activeMembers.length >= TARGET_MEMBER_COUNT) {
    return activeMembers.slice(0, TARGET_MEMBER_COUNT);
  }

  const missing = TARGET_MEMBER_COUNT - activeMembers.length;

  for (let i = 1; i <= missing; i += 1) {
    const sequence = activeMembers.length + i;
    const memberNo = `FEB26-${String(sequence).padStart(3, "0")}`;
    const dob = `1990-02-${String(((sequence - 1) % 28) + 1).padStart(2, "0")}`;

    await client.query(
      `INSERT INTO public.members (first_name, last_name, member_no, status, dob, email, phone)
       VALUES ($1, $2, $3, 'ACTIVE', $4::date, $5, $6)
       ON CONFLICT (member_no)
       DO UPDATE SET status = 'ACTIVE'`,
      [
        `SeedFeb${sequence}`,
        `Member${sequence}`,
        memberNo,
        dob,
        `seedfeb${sequence}@example.com`,
        `020000${String(sequence).padStart(4, "0")}`,
      ]
    );
  }

  const { rows: refreshedMembers } = await client.query(
    `SELECT id, first_name, last_name, dob
     FROM public.members
     WHERE status = 'ACTIVE'
     ORDER BY id ASC
     LIMIT $1`,
    [TARGET_MEMBER_COUNT]
  );

  return refreshedMembers;
}

async function seed() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();

  try {
    await client.query("BEGIN");

    // Cleanup prior seed batch from this script for idempotency.
    await client.query(`DELETE FROM public.contributions WHERE recorded_by = $1`, [MARKER]);
    await client.query(`DELETE FROM public.sabbath_accounts WHERE opened_by = $1`, [MARKER]);
    await client.query(`DELETE FROM public.sabbath_sessions WHERE opened_by = $1 OR notes = $1`, [MARKER]);

    const members = await ensureSeedMembers(client);

    const { rows: funds } = await client.query(
      `SELECT id, name, local_percentage, district_percentage, conference_percentage
       FROM public.funds
       WHERE is_active = true
       ORDER BY id ASC`
    );

    if (funds.length === 0) {
      throw new Error("No active funds found. Seed aborted.");
    }

    const accountIds = [];

    for (const week of februaryWeeks) {
      const { rows: accountInsertRows } = await client.query(
        `INSERT INTO public.sabbath_accounts (week_start, week_end, status, opened_at, opened_by)
         VALUES ($1::date, $2::date, 'CLOSED', now(), $3)
         RETURNING id`,
        [week.weekStart, week.weekEnd, MARKER]
      );

      accountIds.push({
        id: accountInsertRows[0].id,
        weekStart: week.weekStart,
      });

      await client.query(
        `INSERT INTO public.sabbath_sessions (date, status, opened_at, opened_by, notes)
         VALUES ($1::date, 'CLOSED', now(), $2, $2)`,
        [week.weekStart, MARKER]
      );
    }

    for (let i = 0; i < TARGET_CONTRIBUTIONS; i += 1) {
      const account = accountIds[i % accountIds.length];
      const fund = funds[i % funds.length];
      const member = members[i % members.length];

      const amount = toFixed2(20 + ((i % 13) * 5) + (i % 3) * 0.5);
      const split = resolveFundSplitPercentages(fund);

      const conferencePortion = toFixed2((amount * split.conference) / 100);
      const districtPortion = toFixed2((amount * split.district) / 100);
      const localPortion = toFixed2((amount * split.local) / 100);

      const isDaybornFund = isDaybornFundName(fund?.name);
      const parsedDobWeekday = isDaybornFund && member.dob
        ? new Date(`${member.dob}T00:00:00Z`).getUTCDay()
        : null;
      const contributionDay = Number.isFinite(parsedDobWeekday) && parsedDobWeekday >= 0 && parsedDobWeekday <= 6
        ? parsedDobWeekday
        : null;

      const serviceDate = addDays(account.weekStart, i % 7);

      await client.query(
        `INSERT INTO public.contributions (
          amount,
          fund_id,
          member_id,
          payment_method,
          sabbath_account_id,
          service_date,
          conference_portion,
          district_portion,
          local_portion,
          contribution_day,
          recorded_by
        ) VALUES (
          $1, $2, $3, 'CASH', $4, $5::date, $6, $7, $8, $9, $10
        )`,
        [
          amount,
          fund.id,
          member.id,
          account.id,
          serviceDate,
          conferencePortion,
          districtPortion,
          localPortion,
          contributionDay,
          MARKER,
        ]
      );
    }

    const { rows: summaryByFund } = await client.query(
      `SELECT f.name, COUNT(c.id) AS contributions, ROUND(SUM(c.amount)::numeric, 2) AS total_amount
       FROM public.contributions c
       JOIN public.funds f ON f.id = c.fund_id
       WHERE c.recorded_by = $1
       GROUP BY f.name
       ORDER BY f.name`,
      [MARKER]
    );

    const { rows: summaryBySession } = await client.query(
      `SELECT sa.week_start, COUNT(c.id) AS contributions, ROUND(SUM(c.amount)::numeric, 2) AS total_amount
       FROM public.contributions c
       JOIN public.sabbath_accounts sa ON sa.id = c.sabbath_account_id
       WHERE c.recorded_by = $1
       GROUP BY sa.week_start
       ORDER BY sa.week_start`,
      [MARKER]
    );

    await client.query("COMMIT");

    console.log("✅ February treasury seed completed.");
    console.log(`- Members used: ${members.length}`);
    console.log(`- Sabbath accounts created: ${accountIds.length}`);
    console.log(`- Contributions inserted: ${TARGET_CONTRIBUTIONS}`);

    console.log("\nBy fund:");
    console.table(summaryByFund);

    console.log("\nBy session:");
    console.table(summaryBySession);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seed();
