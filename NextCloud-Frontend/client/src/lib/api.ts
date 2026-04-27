export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function emitUnauthorized() {
  window.dispatchEvent(new CustomEvent("cloudspace:unauthorized"));
}

async function parsePayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await parsePayload(response);

  if (!response.ok) {
    if (response.status === 401) {
      emitUnauthorized();
    }

    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? String((payload as { message: string }).message)
        : typeof payload === "object" &&
            payload &&
            "error" in payload &&
            typeof (payload as { error?: unknown }).error === "string"
          ? String((payload as { error: string }).error)
          : `${init?.method || "GET"} ${url} failed`;

    throw new ApiError(message, response.status, payload);
  }

  return { response, payload };
}

export async function fetchJson<T>(url: string, init?: RequestInit) {
  const { payload } = await request(url, init);
  return payload as T;
}

export async function apiRequest(method: string, url: string, body?: unknown) {
  const { response } = await request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function isFeatureUnavailableError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 501) &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    (error.data as { code?: unknown }).code === "feature_unavailable"
  );
}
