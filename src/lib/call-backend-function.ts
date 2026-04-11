export async function callBackendFunction<T = any>(
  functionName: string,
  body: Record<string, any> = {},
  token?: string
): Promise<T> {
  const functionUrl = `/api/functions/${functionName}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Backend function returned ${response.status}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
