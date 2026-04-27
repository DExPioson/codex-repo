# Architecture

## Current auth model

CloudSpace uses one active auth path:

1. The browser submits credentials to `POST /api/auth/login`.
2. The Express adapter validates them against Nextcloud.
3. The adapter tries to convert a real password into a Nextcloud app password through:
   `GET /ocs/v2.php/core/getapppassword?format=json`
4. The adapter stores only delegated credential material in the server-side session.

No browser PKCE flow and no split auth path are active in this branch.

## Server responsibilities

- [`server/credential-provider.ts`](C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\server\credential-provider.ts)
  Bootstraps delegated credentials, resolves the current user, and revokes app passwords on logout.
- [`server/session-store.ts`](C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\server\session-store.ts)
  Owns encrypted SQLite-backed session persistence, hashed lookup tokens, and cookie lifecycle.
- [`server/nextcloud-client.ts`](C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\server\nextcloud-client.ts)
  Executes WebDAV and OCS requests using the delegated credential from the session.
- [`server/index.ts`](C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\server\index.ts)
  Keeps route handlers thin and delegates auth/session/Nextcloud work to the layers above.

## Why real passwords are no longer persisted

The adapter no longer stores the user’s real Nextcloud password in long-lived session state.
If a user logs in with a normal password, that password is used only during the bootstrap request
window required to mint a delegated app password. The persisted session contains:

- `username`
- delegated credential type
- delegated app password
- display override metadata if present

This reduces credential vault risk and makes later OIDC/OAuth migration easier.

## Delegated credential behavior

Default mode is `NEXTCLOUD_BOOTSTRAP_STRATEGY=exchange-or-direct`:

- If the user enters a normal password and Nextcloud allows conversion, the adapter stores the new app password.
- If the user already enters an app password, Nextcloud returns `403` on conversion and the adapter stores that supplied app password directly.

Alternative mode:

- `require-direct-app-password` disables bootstrap exchange and expects the user to enter an app password from the start.

## Future migration path

The credential provider layer is intentionally isolated so the repo can later swap the delegated
credential source without reworking route handlers:

- OIDC bearer tokens
- OAuth access/refresh tokens
- SSO-managed delegated credentials

That future work should replace the credential provider implementation, not reintroduce multiple login paths.
