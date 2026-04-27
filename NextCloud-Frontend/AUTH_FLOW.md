# Auth Flow

## Login

1. The browser sends `email` and `password` to `POST /api/auth/login`.
2. The adapter normalizes the login identifier to a Nextcloud username when needed.
3. The credential provider validates the credentials against:
   `GET /ocs/v2.php/cloud/user?format=json`
4. The provider then attempts delegated bootstrap through:
   `GET /ocs/v2.php/core/getapppassword?format=json`

## Credential bootstrap outcomes

### Bootstrap exchange succeeds

- Input secret was a real login password.
- Nextcloud returns a new app password.
- The adapter discards the real password immediately.
- The session stores only the delegated app password.

### Exchange is rejected with `403`

- The input secret is treated as an already-issued app password.
- The adapter stores that delegated secret directly.
- The auth model is still the same single adapter login flow.

## Session creation

1. The session store generates a random cookie token.
2. The token is hashed before database storage.
3. Session payloads are encrypted before persistence in SQLite.
4. The browser receives an HTTP-only cookie.

## Nextcloud request execution

1. Route handlers load the server-side session from the session store.
2. The Nextcloud client reads the delegated credential from the session.
3. WebDAV and OCS requests execute with Basic Auth using the delegated app password.

## Logout and revocation

1. `POST /api/auth/logout` loads the current session.
2. The credential provider attempts:
   `DELETE /ocs/v2.php/core/apppassword`
3. Local session state is cleared regardless of remote revocation result.

## Security properties of the current design

- Real user passwords are not persisted in long-lived session storage.
- Session lookup tokens are hashed before database storage.
- Session payloads are encrypted at rest.
- One active auth model remains in the repo.

## Remaining limitation

The adapter still stores delegated app passwords in encrypted server-side session state.
That is a meaningful improvement over storing real passwords, but it is still secret material and
should later be replaced or shortened further when the project adopts OIDC/OAuth/SSO.
