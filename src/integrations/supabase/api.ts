// import { supabase } from "./client";

const API_BASE = 'http://localhost:8000/api'; // Change to production URL

export const getContributions = async (churchId?: string) => {
  const url = churchId ? `${API_BASE}/contributions/?church_id=${churchId}` : `${API_BASE}/contributions/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch contributions');
  return { data: await response.json(), error: null };
};

export const getFunds = async (churchId?: string) => {
  let query = (supabase.from("funds") as any)
    .select("id, name, conference_percentage, local_percentage")
    .eq("is_active", true)
    .order("name");

  if (churchId) {
    query = query.eq("church_id", churchId);
  }

  return query;
};

export const getMembers = async (churchId?: string) => {
  let query = supabase
    .from("members")
    .select("id, first_name, last_name")
    .eq("status", "ACTIVE")
    .order("first_name");

  if (churchId) {
    query = query.eq("church_id", churchId);
  }

  return query;
};

export const getSabbathAccounts = async () => {
  return supabase
    .from("sabbath_accounts")
    .select("id, week_start, week_end, status")
    .order("opened_at", { ascending: false });
};

/** Returns the single open sabbath account (session), or null if none. */
export const getOpenSabbathAccount = async () => {
  const { data: openAccounts } = await supabase
    .from("sabbath_accounts")
    .select("id, week_start, week_end, status")
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1);

  if (openAccounts && openAccounts.length > 0) {
    return openAccounts[0];
  }

  const { data: openSessions } = await supabase
    .from("sabbath_sessions")
    .select("date, opened_at, opened_by")
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false })
    .limit(1);

  const openSession = openSessions?.[0];
  if (!openSession) return null;

  const sessionDate = new Date(`${openSession.date}T00:00:00`);
  sessionDate.setHours(0, 0, 0, 0);

  const weekStart = new Date(sessionDate);
  weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const toIsoDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const { data: syncedAccount, error: syncError } = await supabase
    .from("sabbath_accounts")
    .insert({
      week_start: toIsoDate(weekStart),
      week_end: toIsoDate(weekEnd),
      opened_at: openSession.opened_at || new Date().toISOString(),
      opened_by: openSession.opened_by || null,
      status: "OPEN",
    })
    .select("id, week_start, week_end, status")
    .single();

  if (syncError) {
    return null;
  }

  return syncedAccount;
};

/** Contributions for a specific sabbath account (session) only. */
export const getContributionsBySession = async (sabbathAccountId: number) => {
  return supabase
    .from("contributions")
    .select("*, funds(name), members(first_name, last_name), sabbath_accounts(week_start, week_end, status)")
    .eq("sabbath_account_id", sabbathAccountId)
    .order("created_at", { ascending: false });
};

/** Contributions with optional filters for statements. */
export const getContributionsFiltered = async (opts: {
  sabbath_account_id?: number;
  fund_id?: number;
  member_id?: number;
  date_from?: string;
  date_to?: string;
}) => {
  let q = supabase
    .from("contributions")
    .select("*, funds(name), members(first_name, last_name), sabbath_accounts(week_start, week_end, status)")
    .order("service_date", { ascending: true });
  if (opts.sabbath_account_id != null) q = q.eq("sabbath_account_id", opts.sabbath_account_id);
  if (opts.fund_id != null) q = q.eq("fund_id", opts.fund_id);
  if (opts.member_id != null) q = q.eq("member_id", String(opts.member_id));
  if (opts.date_from) q = q.gte("service_date", opts.date_from);
  if (opts.date_to) q = q.lte("service_date", opts.date_to);
  return q;
};

export const createContribution = async (payload: {
  amount: number;
  fund_id: number;
  member_id: number | null;
  payment_method: string | null;
  sabbath_account_id: number;
  service_date: string;
  conference_portion: number;
  local_portion: number;
}) => {
  const attemptPayload: Record<string, any> = { ...payload };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.from("contributions").insert(attemptPayload as any);
    if (!result.error) {
      return result;
    }

    const rawMessage = String(result.error.message || "");
    const rawDetails = String((result.error as any).details || "");
    const code = String((result.error as any).code || "").toUpperCase();

    const missingColumnMatch = rawMessage.match(/Could not find the '([^']+)' column/i);
    const missingColumn = missingColumnMatch?.[1];

    const isMissingColumnError =
      code === "PGRST204" ||
      /could not find/i.test(rawMessage) ||
      /column/i.test(rawDetails);

    if (!isMissingColumnError || !missingColumn) {
      return result;
    }

    if (!(missingColumn in attemptPayload)) {
      return result;
    }

    delete attemptPayload[missingColumn];
  }

  return supabase.from("contributions").insert(payload as any);
};
