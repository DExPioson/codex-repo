# Headless Nextcloud Integration

This repository now includes optional direct Nextcloud integrations in:

- `client/src/lib/auth.ts`
- `client/src/lib/nextcloud.ts`
- `client/src/lib/webdavParser.ts`

## Environment setup

1. Copy `.env.headless.development.example` to `.env.local`.
2. Set `VITE_NEXTCLOUD_URL` to your API backend origin.
3. Configure OAuth2 client values from your Nextcloud admin panel.

## What this gives you

- OAuth2 authorization code + refresh flow.
- OCS helpers for user/capabilities/share APIs.
- WebDAV file listing + upload helpers.
- XML parser for `207 Multi-Status` responses.

## Local route assumptions

- Frontend: `http://localhost:5173`
- Backend Nginx gateway: `http://localhost:8090`
- Nextcloud (internal): `http://nextcloud:80` in Docker network

## Notes

- Existing `/api` adapter flow remains unchanged.
- New helpers are additive; migrate page-by-page as needed.
- Always send `OCS-APIRequest: true` for OCS endpoints.

## OAuth2 Setup Checklist (Required Before First Login)

### 1. Install the OAuth2 app
```bash
docker compose exec nextcloud php occ app:install oauth2
# or if already installed:
docker compose exec nextcloud php occ app:enable oauth2
```

### 2. Register a client in Nextcloud Admin
1. Log in to Nextcloud as admin
2. Go to **Settings -> Administration -> Security**
3. Scroll to **OAuth 2.0 clients**
4. Click **Add client** and fill in:
   - **Name:** Arise Drive Frontend (or any label)
   - **Redirection URI:** `https://drive.icingtree.com/auth/callback`
     (use `http://localhost:3000/auth/callback` for local dev)
   - **Allow PKCE:** Enable this checkbox (Nextcloud 28+)
5. Copy the **Client ID** shown - this is your `VITE_OAUTH_CLIENT_ID`
6. The client secret is **not needed** - the frontend uses PKCE

### 3. Verify PKCE support
```bash
curl -s https://your-nextcloud-domain.com/ocs/v2.php/cloud/capabilities?format=json \
  -H "OCS-APIRequest: true" | python3 -m json.tool | grep -i "oauth\|pkce"
```

### Common Issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| OAuth redirect loops back to Nextcloud UI | `base.php` not whitelisting `/apps/oauth2/authorize` | Apply Fix 1 above |
| `invalid_client` error on token exchange | Wrong `client_id` or PKCE not enabled | Re-check client registration |
| CORS error on PROPFIND | WebDAV methods missing from `Allow-Methods` | Apply Fix 4 above |
| Files list shows current folder as an item | `webdavParser.ts` not stripping parent | Apply Fix 5 above |
| Token lost on page refresh | Access token was in `sessionStorage` (by design) | Refresh token in `localStorage` handles silent re-auth |
