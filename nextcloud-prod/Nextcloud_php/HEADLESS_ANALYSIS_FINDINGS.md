## Analysis Findings

### UI-Coupled Components
- `lib/base.php` : root (`/`) requests redirect to default page or `core.login.showLoginForm`, so browser traffic is intentionally coupled to HTML UI entrypoints.
- `core/Controller/LoginController.php` : `/login` and `/logout` are frontpage routes and `showLoginForm()` returns `TemplateResponse` (`core/login`).
- `lib/private/AppFramework/Middleware/Security/SecurityMiddleware.php` : unauthenticated HTML requests redirect to `core.login.showLoginForm`.
- `apps/files/lib/Controller/ViewController.php` : files app main route loads scripts/styles and returns `TemplateResponse('files', 'index')`.
- `apps/dashboard/lib/Controller/DashboardController.php` : frontpage route (`GET /`) builds and returns dashboard template response.
- `apps/photos/lib/Controller/PageController.php` : photo gallery route returns `TemplateResponse('photos', 'main')`.
- `apps/activity/lib/Controller/ActivitiesController.php` : activity routes return `TemplateResponse` and load activity JS/CSS.
- `apps/viewer/lib/Listener/LoadViewerScript.php` : globally injects viewer JS/CSS into UI page loads.

### API Endpoints (preserve these)
- `PROPFIND/PUT/GET/DELETE/MKCOL/MOVE /remote.php/dav/files/{user}/...` : primary WebDAV file CRUD surface used by custom clients.
- `GET /ocs/v2.php/cloud/capabilities?format=json` : capability discovery for frontend bootstrapping.
- `GET /ocs/v2.php/cloud/user?format=json` : authenticated user profile + quota.
- `GET/POST /ocs/v2.php/apps/files_sharing/api/v1/shares` : list/create shares.
- `GET /ocs/v2.php/apps/files_sharing/api/v1/sharees` : user/group share target lookup.
- `GET /status.php` : health/installation status endpoint.
- `GET /index.php/login` and `GET /index.php/logout` : auth/session flows retained for token/session scenarios.
- `/index.php/apps/*/api/*` and `/ocs/v1.php|/ocs/v2.php/*` : app/OCS APIs required by frontend features.

### Apps to Disable (UI-only)
- `dashboard` : default landing SPA shell and widgets.
- `activity` : activity center UI routes/templates.
- `photos` : photos UI SPA routes/templates.
- `viewer` : file preview UI script bundle injection.
- `theming` : UI branding/theming layer (optional if branding not required).
- `firstrunwizard` : onboarding UI overlays.
- `survey_client` : telemetry/admin UI.
- `recommendations` : recommendation widgets for default UI.
- `weather_status` : dashboard widget.

### Config Changes Needed
- `trusted_domains` : `['18.61.33.72', 'drive.spacepe.in']` -> include only backend hostnames that should serve Nextcloud APIs.
- `overwrite.cli.url` : `'http://18.61.33.72'` -> set to backend API origin with correct scheme (`https://<backend-domain>` in prod).
- `htaccess.RewriteBase` : `'/'` -> keep `/` unless Nextcloud is hosted in a subdirectory.
- `defaultapp` : `''` -> keep empty (preferred), and enforce UI suppression at reverse proxy routing layer.
- `theme` : currently not set -> set `'headless'` if using minimal redirect theme as defense-in-depth.
- `overwriteprotocol` : currently `'https'` -> keep consistent with external TLS termination to avoid mixed-scheme redirects.

### `/apps` Inventory Notes
- Shipped app directories are present under `/apps`.
- Additional custom apps found under `/custom_apps`: `calendar`, `contacts`, `external`, `files_photospheres`, `mail`, `notes`, `oidc_login`, `richdocuments`, `richdocumentscode`, `sociallogin`, `spreed`, `unsplash`, `user_saml`.
- UI-heavy custom apps (`calendar`, `contacts`, `mail`, `notes`, `spreed`, `richdocuments`) should be evaluated feature-by-feature if you intend a fully API-only backend surface.

### `/core` and `/themes` Notes
- `/core/js/` contains login/public/auth bundles (`core/js/login/*`, `core/js/public/*`) and common UI scripts.
- `/themes` currently has only `example/`; no active custom theme detected from `config/config.php`.
