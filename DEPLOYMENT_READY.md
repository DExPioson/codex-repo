# Deployment Ready

## Services

- Frontend app: Vite/React custom frontend
- Adapter API: Node/Express integration layer
- Nextcloud: main backend
- MariaDB: Nextcloud database
- Redis: cache / locking
- Nginx: local gateway in the backend stack

## Default Local Ports

- Frontend: `5173`
- Adapter API: `5000`
- Nextcloud direct: `8080`
- Nextcloud gateway: `8090`

## Required Environment Variables

Frontend / adapter:
- `NC_BASE_URL`
- `NEXTCLOUD_BOOTSTRAP_STRATEGY`
- `ALLOW_MOCK_SERVICES=false`
- `SESSION_COOKIE_SECURE=true` behind HTTPS
- `SESSION_SECRET`
- `SESSION_DB_PATH` if overriding the default encrypted session store location

Backend stack:
- `NC_ADMIN_USER`
- `NC_ADMIN_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `FRONTEND_URL`

Playwright / smoke validation:
- `E2E_EMAIL`
- `E2E_PASSWORD`

## Required Nextcloud Apps

- Talk
- Deck
- Calendar
- Contacts

Optional but environment-dependent:
- Mail

## Reverse Proxy Rules

- Route frontend traffic to the custom frontend host
- Route adapter API requests from `/api/*` to the adapter on `5000`
- Route Nextcloud WebDAV / OCS traffic only through the adapter, not directly from the browser
- Ensure HTTPS termination forwards secure headers so secure cookies remain valid

## Production Readiness Notes

- Keep `ALLOW_MOCK_SERVICES=false`
- Do not commit live `.env` files
- Use secure cookies in HTTPS environments
- Ensure the required Nextcloud apps are installed before exposing dependent UI modules
- Validate `GET /api/capabilities` during startup / health checks so the frontend can disable unsupported modules

## Recommended Pre-Deploy Check

1. Start backend services.
2. Start adapter and frontend.
3. Confirm `GET /api/capabilities` reflects the intended installed apps.
4. Run the full end-to-end smoke flow from login through logout.
