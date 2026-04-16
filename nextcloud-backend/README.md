# Nextcloud Headless Backend

This package runs Nextcloud as an API/DAV backend while redirecting browser UI traffic to the React frontend.

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

This disables UI apps, enables the headless theme, installs OAuth2, and applies
security config. It is safe to run multiple times.

### 3. Register OAuth2 client

1. Open http://localhost:8080 in a browser
2. Log in as `admin` / `adminpassword` (or your `NC_ADMIN_PASSWORD`)
3. Go to **Settings -> Administration -> Security**
4. Scroll to **OAuth 2.0 clients -> Add client**
   - Name: `Arise Drive Dev`
   - Redirect URI: `http://localhost:3000/auth/callback`
   - Enable PKCE
5. Copy the **Client ID** -> set as `VITE_OAUTH_CLIENT_ID` in `.env.development`

### 4. Start the React frontend

```bash
cd ../  # project root
cp .env.headless.development.example .env.development
# Edit .env.development and paste the Client ID from step 3
npm run dev
```

### Volume reset (full clean restart)

```bash
docker compose down -v   # removes volumes - all data wiped
docker compose up -d
bash scripts/inject-config.sh
```
