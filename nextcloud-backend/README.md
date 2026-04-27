# Nextcloud Headless Backend

This package runs Nextcloud as an API/DAV backend while redirecting browser UI traffic to the React frontend.

Current integration mode in this workspace uses the adapter login flow at `/api/auth/login`.
OAuth/PKCE setup is not the active auth path for this branch.

## Quick Start

### 1. Start the stack

```bash
cd nextcloud-backend
docker compose up -d
```

Wait for all services to be healthy (takes ~60-90s on first run):

```bash
watch docker compose ps
# All three services (db, redis, nextcloud) must show "healthy" before continuing
```

### 2. Apply post-init config

Run once after first start (and after any full volume reset):

```bash
bash scripts/inject-config.sh
```

This disables UI apps, enables the headless theme, and applies
security config. It is safe to run multiple times.

### 3. Confirm frontend origin

Set `FRONTEND_URL` to the same origin your Vite app actually uses in development.
The default in this repo is `http://localhost:5173`.

### 4. Start the React frontend

```bash
cd ../NextCloud-Frontend
cp .env.example .env
npm run dev
```

The Express adapter should run separately:

```bash
cd ../NextCloud-Frontend
npx tsx server/index.ts
```

### Legacy OAuth notes

If you later switch this branch to a full OAuth/PKCE strategy, use `http://localhost:5173/auth/callback`
as the local redirect URI. The old `3000` references are stale.

### Volume reset (full clean restart)

```bash
docker compose down -v   # removes volumes - all data wiped
docker compose up -d
bash scripts/inject-config.sh
```
