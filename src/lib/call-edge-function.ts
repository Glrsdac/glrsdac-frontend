/**
 * Utility for calling Supabase edge functions with proper token authentication
 * using direct fetch instead of supabase.functions.invoke() to avoid
 * automatic Authorization header that causes 401 errors.
 */

export async function callEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any> = {},
  token?: string
): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Only add token if provided (some functions may not require it)
  if (token) {
    headers['x-user-token'] = token;
  }

  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Edge function returned ${response.status}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
