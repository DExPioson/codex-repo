/**
 * auth.ts
 * OAuth2 + PKCE flow for Nextcloud.
 * No client_secret is used - safe for browser/SPA environments.
 * Requires Nextcloud 28+ with the oauth2 app installed.
 */

const NC_URL = import.meta.env.VITE_NEXTCLOUD_URL as string;
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_OAUTH_REDIRECT_URI as string;

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Step 1: Redirect user to Nextcloud OAuth2 login page.
 * Stores PKCE verifier and state in sessionStorage for callback validation.
 */
export async function redirectToLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem("pkce_verifier", verifier);
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });

  window.location.href = `${NC_URL}/index.php/apps/oauth2/authorize?${params.toString()}`;
}

/**
 * Step 2: Handle the OAuth2 callback at REDIRECT_URI.
 * Call this on the /auth/callback page with the URL search params.
 */
export async function handleCallback(
  code: string,
  returnedState: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const savedState = sessionStorage.getItem("oauth_state");
  const verifier = sessionStorage.getItem("pkce_verifier");

  if (!savedState || returnedState !== savedState) {
    throw new Error("OAuth state mismatch - possible CSRF attack");
  }
  if (!verifier) {
    throw new Error("PKCE verifier missing from session");
  }

  sessionStorage.removeItem("oauth_state");
  sessionStorage.removeItem("pkce_verifier");

  const res = await fetch(`${NC_URL}/index.php/apps/oauth2/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokens = await res.json();

  sessionStorage.setItem("nc_access_token", tokens.access_token);
  localStorage.setItem("nc_refresh_token", tokens.refresh_token);

  return tokens;
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("nc_refresh_token");
  if (!refreshToken) throw new Error("No refresh token stored");

  const res = await fetch(`${NC_URL}/index.php/apps/oauth2/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) {
    logout();
    throw new Error("Token refresh failed - user must re-authenticate");
  }

  const tokens = await res.json();
  sessionStorage.setItem("nc_access_token", tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem("nc_refresh_token", tokens.refresh_token);
  }

  return tokens.access_token;
}

/**
 * Get the current access token, or null if not authenticated.
 */
export function getToken(): string | null {
  return sessionStorage.getItem("nc_access_token");
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return !!sessionStorage.getItem("nc_access_token");
}

/**
 * Clear all auth state and return to unauthenticated state.
 */
export function logout(): void {
  sessionStorage.removeItem("nc_access_token");
  sessionStorage.removeItem("pkce_verifier");
  sessionStorage.removeItem("oauth_state");
  localStorage.removeItem("nc_refresh_token");
}
