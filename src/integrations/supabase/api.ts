import { supabase } from './client';

async function fetchJson(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    return { data: null, error: { message: `Backend request failed: ${response.status} ${text}` } };
  }

  const data = await response.json();
  return { data, error: null };
}

export const getContributions = async () => {
  return fetchJson('/api/contributions/');
};

export const getFunds = async () => {
  return fetchJson('/api/funds/');
};

export const getMembers = async () => {
  return fetchJson('/api/members/');
};

export const getSabbathAccounts = async () => {
  return fetchJson('/api/sabbath-accounts/');
};

export const getOpenSabbathAccount = async () => {
  const { data, error } = await fetchJson('/api/open-sabbath-account/');
  if (error) return null;
  return data;
};

export const getContributionsBySession = async (sabbathAccountId: number) => {
  const params = new URLSearchParams({ sabbath_account_id: String(sabbathAccountId) });
  return fetchJson(`/api/contributions/?${params.toString()}`);
};

export const getContributionsFiltered = async (opts: {
  sabbath_account_id?: number;
  fund_id?: number;
  member_id?: number;
  date_from?: string;
  date_to?: string;
}) => {
  const params = new URLSearchParams();
  if (opts.sabbath_account_id != null) params.set('sabbath_account_id', String(opts.sabbath_account_id));
  if (opts.fund_id != null) params.set('fund_id', String(opts.fund_id));
  if (opts.member_id != null) params.set('member_id', String(opts.member_id));
  if (opts.date_from) params.set('date_from', opts.date_from);
  if (opts.date_to) params.set('date_to', opts.date_to);
  return fetchJson(`/api/contributions/?${params.toString()}`);
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
  const response = await fetch('/api/contributions/create/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return { data: null, error: { message: `Create contribution failed: ${response.status} ${text}` } };
  }

  const data = await response.json();
  return { data, error: null };
};
