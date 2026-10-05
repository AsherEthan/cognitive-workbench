// API client — relative paths so it works on any host (observatory server at :31337)

async function apiCall<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "此功能尚未啟用或暫時無法取得。" : `讀取失敗（狀態碼 ${response.status}），請稍後再試。`);
  }
  return response.json() as Promise<T>;
}

// Exports — keep names for compatibility with existing hooks
export const localApiCall = apiCall;
export const localOnlyApiCall = apiCall;

// WebSocket stubs — observatory uses HTTP polling, not WebSocket
export function getResolvedWsUrl(): Promise<string> {
  return Promise.resolve("");
}
export const getLocalOnlyWsUrl = getResolvedWsUrl;
