# Deployment

## Required environment variables

Use [`\.env.example`](C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\.env.example) as the baseline.

Required server variables:

- `NC_BASE_URL`
- `SESSION_SECRET`
- `SESSION_DB_PATH`
- `SESSION_COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `NEXTCLOUD_BOOTSTRAP_STRATEGY`
- `NEXTCLOUD_APP_PASSWORD_LABEL`
- `PORT`

Required frontend/proxy variables:

- `VITE_PORT`
- `VITE_API_PROXY_TARGET`
- `VITE_NEXTCLOUD_PROXY_TARGET`

Operational safety variable:

- `ALLOW_MOCK_SERVICES=false`

## Staging vs production

### Staging

- `SESSION_COOKIE_SECURE=false` is acceptable only when testing over plain HTTP.
- `NEXTCLOUD_BOOTSTRAP_STRATEGY=exchange-or-direct` keeps the current staging UX simple.
- `NC_BASE_URL` can point at the local or staging Nextcloud gateway.

### Production

- Set `SESSION_COOKIE_SECURE=true`.
- Use HTTPS end to end.
- Use a long random `SESSION_SECRET`.
- Keep `ALLOW_MOCK_SERVICES=false`.
- Prefer `exchange-or-direct` unless your security policy requires users to input app passwords directly, in which case use `require-direct-app-password`.

## Reverse proxy requirements

- Forward `Set-Cookie` headers unchanged.
- Preserve HTTPS at the edge and pass the correct forwarded proto headers if your stack depends on them.
- Route `/api` to the Express adapter.
- Route `/ocs` and `/remote.php` to Nextcloud when you are using the Vite-style proxy model in front of the app.

## Nextcloud prerequisites

- The target Nextcloud instance must support the official app-password conversion endpoint:
  `/ocs/v2.php/core/getapppassword`
- Users must be allowed to create app passwords in the instance policy.
- If users have two-factor authentication enabled, they may need to log in with an app password directly depending on server policy.

## Session storage notes

- `SESSION_DB_PATH` should point to persistent storage, not ephemeral container scratch space.
- The adapter encrypts session payloads, but the delegated app password is still sensitive secret material and must be protected accordingly.
