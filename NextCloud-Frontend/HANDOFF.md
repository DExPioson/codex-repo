# CloudSpace LLM Handoff Document

> **Purpose**: Context transfer for an LLM to continue building CloudSpace from Prompt #09 onward.
> **Last updated**: 2026-04-09 | **Last completed prompt**: #08 (Polish Pass) + NC Adapter Integration + Playwright E2E Suite
> **BREAKING CHANGE**: The mock Express/SQLite backend has been **replaced** with a live Nextcloud API adapter. All data now comes from a real Nextcloud 28 instance.

---

## 1. Project Overview

**CloudSpace** is a modern React frontend redesign for a self-hosted Nextcloud instance. It was originally a UI-only prototype with a mock Express/SQLite backend. As of the latest integration work, the backend is now a **Nextcloud API adapter** — `server/index.ts` proxies every API call to a real Nextcloud instance running at `NC_BASE_URL` (default `http://localhost:8080`).

The frontend code (`client/src/`) is **completely unchanged** from Prompt #08. The API contract (`{ data: ... }` envelope) is preserved. The adapter translates between Nextcloud's various API formats (OCS, WebDAV, CalDAV, CardDAV, REST) and the CloudSpace schema types.

**Repository**: `https://github.com/DExPioson/NextCloud-Frontend`
**Branch**: `staging`
**Owner**: Piyush Sharma (working with Gaurav — GitHub: grvsmalik)
**Local paths**:
- Frontend: `G:\cloudspace-frontend\`
- Backend (Nextcloud Docker): `G:\cloudspace-backend\` (separate folder, not a git submodule)

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| UI Framework | React | 19.2.4 | With TypeScript |
| Build Tool | Vite | 8.0.4 | Root = `client/`, output = `dist/` |
| CSS | Tailwind CSS | 3.4.19 | **v3, NOT v4** |
| Components | shadcn/ui | Latest | Radix UI primitives, copy-pasted into `components/ui/` |
| Routing | wouter | 3.9.0 | Hash-based via `useHashLocation` from `wouter/use-hash-location` |
| Data Fetching | TanStack Query | 5.96.2 | `staleTime: 30s`, `gcTime: 5min`, `retry: 1` |
| Server | Express | 5.2.1 | Port 5000, Vite proxies `/api` to it |
| Session | express-session | 1.19.0 | SQLite-backed via connect-sqlite3, stored in `sessions.db` |
| NC HTTP Client | node fetch | built-in | Custom adapter in `server/nc-adapter.ts` |
| XML Parsing | xml2js | 0.6.2 | For WebDAV/OCS XML responses |
| iCal/vCard | ical.js | 2.2.1 | CalDAV event and CardDAV contact parsing |
| DnD | @hello-pangea/dnd | 18.0.1 | Used in Deck kanban |
| Icons | lucide-react | 1.7.0 | |
| Date utils | date-fns | 4.1.0 | |
| E2E Testing | Playwright | 1.59.1 | 81 tests, Chromium only |
| Variants | class-variance-authority | 0.7.1 | For component variant styling |

**Removed from active use** (still in package.json but no longer functional):
- Drizzle ORM / better-sqlite3 — was the mock DB, now `storage.ts` is a stub with caches only
- drizzle-zod — insert schemas still exported from `shared/schema.ts` but not used by the adapter

---

## 3. Project Structure

```
cloudspace-frontend/
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx                  # Entry point, renders <App />
│       ├── App.tsx                   # Root: theme, QueryClient, hash router, AppShell
│       ├── index.css                 # Design tokens (HSL CSS vars), scrollbar, animations
│       ├── components/
│       │   ├── layout/
│       │   │   ├── CloudSpaceLogo.tsx
│       │   │   ├── CommandPalette.tsx # Cmd+K command palette with search, nav, quick actions
│       │   │   ├── Sidebar.tsx       # Nav sidebar with collapse toggle, unread badges
│       │   │   └── TopBar.tsx        # Top bar with command palette, notification popover, user dropdown
│       │   └── ui/                   # shadcn/ui components (18 total)
│       ├── lib/
│       │   ├── api.ts                # apiRequest(method, url, body?) fetch wrapper
│       │   ├── dateUtils.ts          # formatRelative, formatEventTime, formatEventDate
│       │   └── utils.ts              # cn(), getAvatarColor(), getInitials()
│       └── pages/
│           ├── Login.tsx             # Login form (piyush@cloudspace.home / cloudspace123)
│           ├── Dashboard.tsx         # 5 widgets: storage ring, recent files, calendar, talk, activity
│           ├── Files.tsx             # File browser with breadcrumbs, grid/list, CRUD
│           ├── Talk.tsx              # 3-panel chat: conversation list, messages, info panel
│           ├── Calendar.tsx          # Month/week/day/agenda views, event CRUD
│           ├── Notes.tsx             # Split-pane markdown editor, auto-save
│           ├── Contacts.tsx          # 3-panel: groups, grid/list, detail panel, CRUD
│           ├── Deck.tsx              # Kanban with @hello-pangea/dnd, card detail modal
│           ├── Mail.tsx              # 3-panel email client with compose dialog
│           ├── Activity.tsx          # Filterable activity feed with stats + date groups
│           ├── Media.tsx             # Photo gallery with lightbox, albums, multi-select
│           └── Settings.tsx          # Multi-section settings: profile, security, appearance, storage, etc.
├── server/
│   ├── index.ts                      # Express API server — Nextcloud adapter (856 lines)
│   ├── nc-adapter.ts                 # Low-level NC HTTP client: OCS, WebDAV, CalDAV, CardDAV helpers
│   ├── mappers.ts                    # Pure functions: NC API responses → CloudSpace schema types
│   └── storage.ts                    # Stub: in-memory caches (cardLookup, conversationTokens, etc.)
├── shared/
│   └── schema.ts                     # TypeScript types + Drizzle table definitions (types still used)
├── e2e/                              # Playwright test specs (14 files, 1152 lines)
│   ├── helpers.ts                    # login(), navigateTo(), expectToast(), waitForData()
│   ├── 01-auth.spec.ts               # Login page, failed/success login, sign out
│   ├── 02-layout.spec.ts             # Sidebar nav, collapse, badges, command palette, dark mode
│   ├── 03-dashboard.spec.ts          # Widget loading, storage ring, recent files
│   ├── 04-files.spec.ts              # File browser, grid/list, folder nav, create folder
│   ├── 05-talk.spec.ts               # Conversations, messages, send, info panel, calls, groups
│   ├── 06-calendar.spec.ts           # Month view, view switching, navigation, event CRUD
│   ├── 07-notes.spec.ts              # Notes list, select/read, create, delete, pin/unpin
│   ├── 08-contacts.spec.ts           # Contact list, search, detail panel, create, delete
│   ├── 09-deck.spec.ts               # Board list, stacks, card modal, create/delete cards
│   ├── 10-mail.spec.ts               # Mail folders, inbox, read, star, search, compose, delete
│   ├── 11-activity.spec.ts           # Activity feed, filter tabs, search, mark all read
│   ├── 12-media.spec.ts              # Gallery, albums, lightbox, multi-select, list view, upload
│   ├── 13-settings.spec.ts           # All 7 settings sections
│   └── 14-theme-persistence.spec.ts  # Dark mode + sidebar collapse persist across reload/nav
├── playwright/
│   ├── global-setup.ts               # Logs in via API, saves session to .auth/session.json
│   ├── .auth/                        # Session state (gitignored)
│   └── KNOWN_ISSUES.md               # Notes app dependency documentation
├── playwright.config.ts              # globalSetup, storageState, Chromium-only
├── .env                              # NC_BASE_URL, SESSION_SECRET, NODE_TLS_REJECT_UNAUTHORIZED
├── HANDOFF.md                        # This file
├── package.json
├── vite.config.ts                    # Alias: @/ -> client/src/, @shared -> shared/, proxy /api → :5000
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
└── eslint.config.js
```

---

## 4. Architecture Patterns

### Routing
- Hash-based routing: `/#/`, `/#/files`, `/#/talk`, etc.
- `App.tsx` uses `<Router hook={useHashLocation}>` from wouter
- `/login` is outside the `AppShell`; all other routes are inside it

### Data Flow
- All API calls return `{ data: ... }` envelope — **this contract is unchanged**
- Pages use `useQuery` with queryKey = `["/api/endpoint"]`
- Mutations use `useMutation` + `queryClient.invalidateQueries()`
- Optimistic updates used in Talk (messages) and Deck (card moves)
- The Express server acts as a transparent proxy — it receives CloudSpace API calls, translates them to NC API calls, maps the responses back to CloudSpace schema types

### Adapter Architecture (server/)
```
Browser → Vite (:5173) → /api proxy → Express (:5000) → Nextcloud (:8080)
                                           │
                                    nc-adapter.ts (HTTP client)
                                    mappers.ts (response mapping)
                                    storage.ts (in-memory caches)
```

The adapter uses three NC API families:
1. **OCS API** — User info, Talk/Spreed, Activity (JSON responses via `?format=json`)
2. **WebDAV/CalDAV/CardDAV** — Files, Calendar events, Contacts (XML responses parsed by xml2js/ical.js)
3. **REST API** — Notes, Deck, Mail (native JSON endpoints)

### Session Management
- Login: `POST /api/auth/login` extracts username from email (`piyush@cloudspace.home` → `piyush`)
- Authenticates against NC OCS: `GET /ocs/v2.php/cloud/users/{username}`
- Generates an app password via `GET /ocs/v2.php/core/getapppassword` (falls back to original password)
- Stores `{ username, appPassword }` in `express-session` backed by SQLite (`sessions.db`)
- All subsequent requests use Basic auth with the app password

### Styling
- HSL CSS custom properties in `:root` and `.dark` (see `index.css`)
- Theme toggle: `localStorage.getItem("cloudspace-theme")`, toggles `.dark` class on `<html>`
- All colors reference CSS vars: `hsl(var(--primary))`, `bg-primary`, `text-muted-foreground`, etc.
- Layout vars: `--sidebar-width: 240px`, `--sidebar-collapsed-width: 60px`, `--topbar-height: 56px`

### Toast Pattern
Pages use an inline toast helper (not a shared component):
```ts
function showToast(msg: string) {
  const el = document.createElement("div");
  el.id = "cs-toast";
  el.className = "fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
```

### Shared Utilities (`lib/utils.ts`)
- `cn(...classes)` — Tailwind merge via clsx + tailwind-merge
- `getAvatarColor(name)` — deterministic color class string from name hash (7 color pairs with dark mode)
- `getInitials(name)` — "Piyush Sharma" -> "PS"

---

## 5. Completed Screens (Prompts #01–#08)

| # | Prompt | Route | Screen | Status |
|---|--------|-------|--------|--------|
| 01 | Scaffold | `/login` | App shell, sidebar, topbar, login page, design tokens | Done |
| 02 | Dashboard + Files | `/`, `/files` | 5-widget dashboard, file browser with CRUD | Done |
| 03 | Talk | `/talk` | 3-panel chat, conversation list, messages, info panel | Done |
| 04 | Calendar + Notes | `/calendar`, `/notes` | Month/week/day/agenda calendar, split-pane markdown notes | Done |
| 05 | Contacts + Deck | `/contacts`, `/deck` | Contact manager with groups, kanban board with DnD | Done |
| 06 | Mail + Activity | `/mail`, `/activity` | 3-panel email client with compose; filterable activity feed | Done |
| 07 | Media + Settings | `/media`, `/settings` | Photo gallery with lightbox; multi-section settings page | Done |
| 08 | Polish Pass | All | Command palette, notifications, user dropdown, sidebar collapse, animations | Done |

---

## 6. Remaining Work: Prompt #09

| # | Prompt | Route | Screen | Status |
|---|--------|-------|--------|--------|
| 09 | Final | All | Final QA, performance, accessibility, build + deploy | **Next** |

All 12 screens are built, polished, and tested against live Nextcloud. What comes next:
- Production build verification (`npm run build`)
- Performance audit (bundle size, lazy loading)
- Accessibility check
- Deploy

---

## 7. API Routes — Nextcloud Mapping Reference

All routes are in `server/index.ts`. Response format: `{ data: ... }`. Every route proxies to a real Nextcloud API endpoint.

### Auth
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `POST /api/auth/login` | `GET /ocs/v2.php/cloud/users/{user}` + `GET /ocs/v2.php/core/getapppassword` | OCS |
| `POST /api/auth/logout` | Session destroy (local only) | — |

### User
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/user` | `GET /ocs/v2.php/cloud/users/{user}` | OCS |
| `PATCH /api/user` | `POST /ocs/v2.php/cloud/users/{user}` (key/value pairs) | OCS |

### Dashboard
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/dashboard` | `PROPFIND /remote.php/dav/files/{user}/` + `GET /ocs/v2.php/cloud/users/{user}` | WebDAV + OCS |

### Files
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/files?path=/` | `PROPFIND /remote.php/dav/files/{user}{path}` (Depth: 1) | WebDAV |
| `POST /api/files` (folder) | `MKCOL /remote.php/dav/files/{user}{path}/{name}` | WebDAV |
| `POST /api/files` (file) | `PUT /remote.php/dav/files/{user}{path}/{name}` | WebDAV |
| `PATCH /api/files/:id` | `MOVE (from → to)` | WebDAV |
| `DELETE /api/files/:id` | `DELETE /remote.php/dav/files/{user}{path}` | WebDAV |

### Talk / Conversations
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/conversations` | `GET /ocs/v2.php/apps/spreed/api/v4/room` | OCS |
| `GET /api/conversations/:id` | `GET /ocs/v2.php/apps/spreed/api/v4/room/{token}` | OCS |
| `POST /api/conversations` | `POST /ocs/v2.php/apps/spreed/api/v4/room` | OCS |
| `PATCH .../read` | `POST /ocs/v2.php/apps/spreed/api/v4/chat/{token}/read` | OCS |
| `PATCH .../mute` | `POST /ocs/v2.php/apps/spreed/api/v4/room/{token}/notify` | OCS |
| `DELETE .../members/me` | `DELETE /ocs/v2.php/apps/spreed/api/v4/room/{token}/participants/self` | OCS |
| `GET .../messages` | `GET /ocs/v2.php/apps/spreed/api/v4/chat/{token}` | OCS |
| `POST .../messages` | `POST /ocs/v2.php/apps/spreed/api/v4/chat/{token}` | OCS |

**Important**: Talk uses conversation **tokens** (not numeric IDs) internally. The adapter maintains a `conversationTokens` Map in `storage.ts` to translate between CloudSpace numeric IDs and NC tokens.

### Calendar / Events
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/events` | `REPORT /remote.php/dav/calendars/{user}/personal/` (CalDAV query) | CalDAV |
| `GET /api/events/:id` | Same REPORT, filter by hash ID | CalDAV |
| `POST /api/events` | `PUT /remote.php/dav/calendars/{user}/personal/{uid}.ics` | CalDAV |
| `PATCH /api/events/:id` | `PUT` on cached href | CalDAV |
| `DELETE /api/events/:id` | `DELETE` on cached href | CalDAV |

Events are parsed from iCal using `ical.js`. The `eventHrefs` Map caches `event.id → CalDAV href` for update/delete.

### Notes
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/notes` | `GET /index.php/apps/notes/api/v1/notes` | REST |
| `GET /api/notes/:id` | `GET /index.php/apps/notes/api/v1/notes/{id}` | REST |
| `POST /api/notes` | `POST /index.php/apps/notes/api/v1/notes` | REST |
| `PATCH /api/notes/:id` | `PUT /index.php/apps/notes/api/v1/notes/{id}` | REST |
| `DELETE /api/notes/:id` | `DELETE /index.php/apps/notes/api/v1/notes/{id}` | REST |

### Contacts
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/contacts` | `REPORT /remote.php/dav/addressbooks/users/{user}/contacts/` (CardDAV) | CardDAV |
| `POST /api/contacts` | `PUT /remote.php/dav/addressbooks/users/{user}/contacts/{uid}.vcf` | CardDAV |
| `PATCH /api/contacts/:id` | `PUT` on cached href | CardDAV |
| `DELETE /api/contacts/:id` | `DELETE` on cached href | CardDAV |

Contacts are parsed from vCard using `ical.js`. The `contactHrefs` Map caches `contact.id → CardDAV href`.

### Deck (Kanban)
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/boards` | `GET /index.php/apps/deck/api/v1.0/boards` | REST |
| `GET /api/boards/:id` | `GET .../boards/{id}` + `GET .../boards/{id}/stacks` | REST |
| `POST /api/boards` | `POST /index.php/apps/deck/api/v1.0/boards` | REST |
| `POST .../stacks` | `POST .../boards/{id}/stacks` | REST |
| `POST .../cards` | `POST .../boards/{bid}/stacks/{sid}/cards` | REST |
| `PATCH /api/cards/:id` | `PUT .../boards/{bid}/stacks/{sid}/cards/{id}` | REST |
| `DELETE /api/cards/:id` | `DELETE .../boards/{bid}/stacks/{sid}/cards/{id}` | REST |

The `cardLookup` Map caches `card.id → { boardId, stackId }` because Deck's REST API requires both board and stack IDs for card operations.

### Mail
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/emails/counts` | (returns static `{ inbox: 0, drafts: 0, spam: 0 }`) | REST |
| `GET /api/emails?folder=inbox` | `GET .../accounts/{aid}/mailboxes/{mid}/messages` | REST |
| `GET /api/emails/:id` | `GET .../accounts/{aid}/messages/{id}` | REST |
| `POST /api/emails` | `POST .../accounts/{aid}/send` | REST |
| `PATCH /api/emails/:id` | `PUT .../messages/{id}/flag` | REST |
| `DELETE /api/emails/:id` | `DELETE .../messages/{id}` | REST |

**Important**: `GET /api/emails/counts` is registered BEFORE `GET /api/emails/:id` in Express to avoid "counts" matching as an `:id` param. The `ensureMailAccount()` helper auto-discovers the primary mail account and caches mailbox IDs on first request.

### Activity
| CloudSpace Route | NC API | Protocol |
|------------------|--------|----------|
| `GET /api/activity` | `GET /ocs/v2.php/apps/activity/api/v2/activity/all` | OCS |
| `PATCH /api/activity/:id/read` | Local only (`activityReadState` Map) | — |
| `POST /api/activity/read-all` | Local only | — |

Activity read/unread state is tracked in-memory only — NC's Activity API has no read/unread concept.

---

## 8. Data Layer (Adapter + Caches)

The old SQLite database (`dev.db`) and Drizzle ORM are **no longer used**. `storage.ts` is now a stub containing only in-memory caches:

| Cache | Type | Purpose |
|-------|------|---------|
| `cardLookup` | `Map<number, { boardId, stackId }>` | Deck card → board/stack mapping for update/delete |
| `conversationTokens` | `Map<number, string>` | CloudSpace conversation ID → NC Talk room token |
| `mailAccount` | `{ accountId, mailboxes: Map<string, number> }` | Primary mail account + folder→mailbox ID mapping |
| `eventHrefs` | `Map<number, string>` | CloudSpace event ID → CalDAV href for update/delete |
| `contactHrefs` | `Map<number, string>` | CloudSpace contact ID → CardDAV href for update/delete |
| `activityReadState` | `Map<number, boolean>` | Activity read/unread state (local only) |

**Critical**: These caches are **in-memory and volatile**. Restarting the Express server clears them. The first `GET` call after restart repopulates them. This means:
- You must `GET /api/boards/:id` before you can `PATCH/DELETE /api/cards/:id`
- You must `GET /api/conversations` before you can access messages by conversation ID
- You must `GET /api/events` before you can `PATCH/DELETE /api/events/:id`

The `shared/schema.ts` TypeScript types are still used by `mappers.ts` for return type annotations. The Drizzle table definitions are inert.

---

## 9. Seed Data (Live Nextcloud)

The Nextcloud instance is seeded with realistic data via `cloudspace-backend/seed/seed.sh` (1800 lines):

| Resource | Count | NC App |
|----------|-------|--------|
| Users | 10 (piyush + 9 team members) | Core |
| Folders | 50 | Files (WebDAV) |
| Files | 100 | Files (WebDAV) |
| Calendar Events | ~80 | Calendar (CalDAV) |
| Contacts | 100 | Contacts (CardDAV) |
| Notes | 50 | Notes app |
| Deck Boards | 20 | Deck app |
| Deck Cards | 800 | Deck app |
| Talk Rooms | 10 | Spreed/Talk app |
| Talk Messages | 200 | Spreed/Talk app |
| File Shares | 20+ | Sharing API |

### Credentials

| User | Password | Role |
|------|----------|------|
| admin | CloudSpace2026! | Nextcloud Admin |
| piyush | cloudspace123 | Primary test user |
| gaurav, rohan, priya, arjun, neha, vikram, anjali, rahul, kavita | test123 | Team members |

---

## 10. Current App.tsx Routes

```tsx
<Route path="/">{() => <Dashboard />}</Route>
<Route path="/files">{() => <Files />}</Route>
<Route path="/talk">{() => <Talk />}</Route>
<Route path="/calendar">{() => <Calendar />}</Route>
<Route path="/notes">{() => <Notes />}</Route>
<Route path="/contacts">{() => <Contacts />}</Route>
<Route path="/deck">{() => <Deck />}</Route>
<Route path="/mail">{() => <Mail />}</Route>
<Route path="/activity">{() => <Activity />}</Route>
<Route path="/media">{() => <Media />}</Route>
<Route path="/settings">{() => <Settings />}</Route>
```

---

## 11. Git History

```
a8bbef8 test: fix notes tests — install NC Notes app, reseed 50 notes, add waitForResponse
22e4314 test: add full Playwright E2E suite with NC adapter session handling
c0e71fd feat: overhaul Talk page with search, calls, mute, groups, and admin system
0da49c0 feat: add media gallery, settings page, and polish pass
ffb104e feat: add mail and activity screens
e1a88c2 feat: add contacts and deck screens
3d811c0 feat: add calendar and notes screens
e199fe1 feat: add talk screen with chat, calls, and group management
26063dd feat: add dashboard and files browser
a47198c chore: scaffold CloudSpace project — design system, app shell, and login page
```

Branch: `staging`, remote: `origin` → `https://github.com/DExPioson/NextCloud-Frontend.git`
Git user: `grvsmalik` / `grvsmalik@users.noreply.github.com`

---

## 12. Dev Workflow & Gotchas

### Daily Startup Sequence

```
1. Start Docker Desktop            → wait until engine status shows "Running"
2. cd cloudspace-backend
   docker compose up -d            → boots the Nextcloud containers (port 8080)
3. Wait ~60 seconds                → NC needs time to initialize on first boot
4. cd cloudspace-frontend
   npm run dev                     → Terminal 1 (Vite dev server on :5173)
5. npx tsx server/index.ts         → Terminal 2 (API adapter on :5000)
6. npx playwright test             → (optional) verify everything works — 81 tests
```

### Environment Variables (`.env`)

```
NC_BASE_URL=https://localhost          # The NC instance URL (adapter uses this)
NODE_TLS_REJECT_UNAUTHORIZED=0         # Required for self-signed certs
SESSION_SECRET=<redacted>              # Express session secret
PORT=5000                              # API server port
```

**Note**: The `.env` uses `https://localhost` because the full Nextcloud AIO setup serves HTTPS. If running the minimal docker-compose from `cloudspace-backend/`, the container maps port 8080→80 (plain HTTP). The adapter in `nc-adapter.ts` reads `NC_BASE_URL` and uses it as-is. The seed script requires `http://localhost:8080` because `curl -sk` for HTTPS fails in Git Bash on Windows.

### Critical Gotchas

1. **Express server must be manually restarted** after editing `server/index.ts`, `nc-adapter.ts`, `mappers.ts`, or `storage.ts`. Find PID with `netstat -ano | findstr ":5000"`, kill with `taskkill //PID <pid> //F`, then restart.

2. **In-memory caches clear on restart** — the first page load after restarting the server will be slow as it repopulates `conversationTokens`, `cardLookup`, `eventHrefs`, `contactHrefs`, and `mailAccount`. If you get 404s on card/event/contact operations, navigate to the parent listing first to repopulate the cache.

3. **`sessions.db` persists** — the session cookie remains valid across server restarts. Delete `sessions.db` to force re-login.

4. **Vite HMR can get stale** — if you see errors about duplicate identifiers after refactoring, stop and restart the Vite dev server completely.

5. **Radix Select**: `<SelectItem value="">` is invalid — Radix requires non-empty string values. Use a placeholder like `"unassigned"`.

6. **TypeScript check**: Run `npm run check` after every prompt to verify. Must pass before committing.

7. **Name conflicts**: lucide-react exports icon components named `Activity`, `Mail`, etc. When importing schema types with the same name, alias them: `import type { Activity as ActivityType } from "@shared/schema"`.

8. **Talk API quirks**: The OCS Spreed API requires `?format=json` appended to get JSON responses (default is XML). Conversation operations use room **tokens** (string), not numeric IDs. The adapter maintains a token cache in `storage.ts`.

9. **Deck API requires board+stack context**: To update or delete a card, you need `boardId` and `stackId`. These are cached in `cardLookup` when boards are fetched. If the cache is cold, card operations fail with 404.

10. **Notes app must be installed separately**: It's not included in the Nextcloud 28 base image. Install with `docker exec -u www-data <container> php occ app:install notes`.

### Commit Workflow
```bash
git add <specific files>   # Never git add -A
git commit -m "feat: <description>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main:staging
```

---

## 13. Design Token Reference

Light mode key colors:
- Primary: `hsl(243 75% 59%)` — warm indigo
- Background: white
- Foreground: `hsl(220 13% 9%)`
- Muted: `hsl(220 14% 96%)`
- Border: `hsl(220 13% 91%)`
- Destructive: `hsl(0 84% 60%)`

Dark mode: `.dark` class on `<html>` flips all CSS vars.

Border radius: `--radius: 0.5rem`

---

## 14. Sidebar Badge System

`Sidebar.tsx` fetches 3 separate queries for badge counts:
1. **Talk**: `GET /api/conversations` → sum of `unreadCount` across all conversations
2. **Mail**: `GET /api/emails/counts` → `counts.inbox` (unread inbox emails)
3. **Activity**: `GET /api/activity?limit=50&type=all` → count of items where `!isRead`

All use `staleTime: 30_000`. Badge style: `bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 min-w-[18px] text-center`.

---

## 15. Graceful Degradation

Every NC API call in `server/index.ts` is wrapped in try/catch. If an NC app is missing or returns an error, the adapter returns `{ data: [] }` with HTTP 200. This means:
- If the Notes app isn't installed → Notes page shows empty state
- If Talk/Spreed isn't installed → Talk page shows empty conversation list
- If Deck isn't installed → Deck page shows empty board list
- If Mail isn't configured → Mail page shows folders but no messages

The frontend already has empty state UIs for all pages, so missing NC apps degrade gracefully.

---

## 16. Next Step: Prompt #09

The next prompt to implement is **#09: Final QA + Build + Deploy**.

All 12 screens are built, polished, and passing 81 E2E tests against a live Nextcloud backend. What comes next:
- Production build verification (`npm run build`)
- Final QA across all screens
- Performance audit (bundle size, lazy loading)
- Accessibility check
- Deploy

### Implementation Notes
- Media uses **inline mock data** (no NC integration) — 24 photos from `picsum.photos`, 5 albums
- Settings Appearance section directly modifies `document.documentElement` for theme/accent/fontSize — theme persists via `localStorage`, accent color and font size are ephemeral
- Command palette uses inline mock data for file/contact search results (no API call)
- Notification bell uses hardcoded notifications (no API endpoint)

---

## 17. Nextcloud Backend Setup

A separate `cloudspace-backend/` folder contains the Docker infrastructure. It is NOT a git submodule — it's a standalone directory alongside the frontend repo.

### docker-compose.yml

Runs `nextcloud:28` + `postgres` on port 8080:
```yaml
# Container: cloudspace-backend-nextcloud-1
# Port mapping: 8080 → 80 (plain HTTP)
# Database: cloudspace-backend-db-1 (PostgreSQL)
```

### First-Time Setup

```bash
cd cloudspace-backend
docker compose up -d
# Wait for NC to initialize (~60 seconds)

# Install required apps (not included in base image)
docker exec -u www-data cloudspace-backend-nextcloud-1 php occ app:install deck
docker exec -u www-data cloudspace-backend-nextcloud-1 php occ app:install spreed
docker exec -u www-data cloudspace-backend-nextcloud-1 php occ app:install notes

# Disable password policy (needed for simple test passwords)
docker exec -u www-data cloudspace-backend-nextcloud-1 php occ app:disable password_policy

# Seed data
chmod +x seed/seed.sh
NC_BASE_URL="http://localhost:8080" bash seed/seed.sh
```

### Seed Script Details

`seed/seed.sh` is 1800 lines of bash. Key characteristics:
- Runs in **Git Bash** (not WSL, not PowerShell)
- No `python3` or `jq` available — JSON parsing done with `grep -o` patterns
- Uses `curl -sk` for HTTP calls (the `-k` is for HTTPS setups; not needed on HTTP)
- Talk room creation requires **form-encoded POST** (not JSON content-type) and returns XML tokens
- Idempotent: HTTP 409 (already exists) responses are treated as success
- Must use `NC_BASE_URL="http://localhost:8080"` explicitly in Git Bash (the default `https://localhost` in the script fails on Windows Git Bash due to TLS)

### Daily Startup

```
1. Start Docker Desktop            → wait for engine "Running"
2. docker compose up -d            → boots NC containers
3. Wait ~60 seconds                → NC initialization
4. cd cloudspace-frontend
   npm run dev                     → Vite dev server (:5173)
5. npx tsx server/index.ts         → API adapter (:5000)
6. npx playwright test             → (optional) 81-test verification
```

### Reset Everything

```bash
cd cloudspace-backend
docker compose down -v   # Removes all containers and volumes
# Then re-run first-time setup from step 1
```

---

## 18. Playwright Test Suite

### Overview

- **81 tests** across 14 spec files covering all 12 screens + auth + theme persistence
- All tests run against the **live Nextcloud backend** — no mocking
- All assertions are **structural** (first visible item, count > 0, container exists) — never assert on specific data values from the live backend
- Runtime: ~2.3 minutes on Chromium (headless)
- Status: **81 passed, 0 skipped, 0 failed**

### Configuration (`playwright.config.ts`)

```typescript
{
  testDir: "./e2e",
  globalSetup: "./playwright/global-setup.ts",
  fullyParallel: false,         // Sequential — tests may depend on prior state
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    storageState: "playwright/.auth/session.json",
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
}
```

### Global Setup (`playwright/global-setup.ts`)

Logs in via `POST http://localhost:5000/api/auth/login` with `piyush@cloudspace.home` / `cloudspace123`, saves the session cookie to `playwright/.auth/session.json`. This file is gitignored.

### Test Helpers (`e2e/helpers.ts`)

- `login(page)` — checks if storageState session is valid; only does form login if needed
- `navigateTo(page, path)` — `goto` + `waitForLoadState("networkidle")`
- `expectToast(page, text?)` — waits for `#cs-toast` element
- `waitForData(page)` — alias for `waitForLoadState("networkidle")`

### Key Testing Patterns

1. **networkidle after every navigation** — required because the NC adapter makes real HTTP calls
2. **waitForResponse for slow endpoints** — Notes tests use `page.waitForResponse(r => r.url().includes("/api/notes"))` because the NC Notes API can be slow
3. **test.skip() for empty data** — Notes tests gracefully skip if no notes exist in NC
4. **Generous timeouts** — 10000ms on all `toBeVisible` assertions for API-dependent content
5. **No hardcoded data assertions** — never check for specific names like "Rohan" or "Product Roadmap"; always check structural presence (`.first()`, `.count() > 0`)

### Running Tests

```bash
npx playwright test              # Headless, all tests
npx playwright test --ui         # Interactive UI mode
npx playwright test e2e/07-notes.spec.ts   # Single file
npx playwright test --reporter=list        # Verbose output
```

### Test File Summary

| File | Tests | Covers |
|------|-------|--------|
| 01-auth | 4 | Login page render, failed login, success login, sign out |
| 02-layout | 8 | Sidebar nav, collapse/expand, badges, command palette (3 tests), notifications, user dropdown, dark mode |
| 03-dashboard | 3 | Widget loading, storage ring, recent files links |
| 04-files | 4 | File browser, grid/list toggle, folder navigation, create folder |
| 05-talk | 9 | Conversations, select/view, send message, info panel, search, create group, voice call, incoming call |
| 06-calendar | 5 | Month view, view switching, month navigation, create event, delete event |
| 07-notes | 5 | Page load, select/read, create, delete, pin/unpin |
| 08-contacts | 6 | Page load, grid/list toggle, search, detail panel, create, delete |
| 09-deck | 5 | Board list, stacks, card modal, create card, delete card |
| 10-mail | 8 | Folders, inbox, read email, star, switch folders, search, compose, delete |
| 11-activity | 4 | Feed load, filter tabs, search, mark all read |
| 12-media | 7 | Gallery, albums, lightbox, keyboard nav, multi-select, list view, upload dialog |
| 13-settings | 9 | All 7 sections render + profile edit/save + profile discard + security + sessions + notifications + appearance + storage + connected apps + about |
| 14-theme | 2 | Dark mode persistence, sidebar collapse persistence |
| **Total** | **81** | |

---

## 19. Mapper Functions Reference (`server/mappers.ts`)

Each mapper is a pure function converting NC API data to CloudSpace schema types:

| Function | Input | Output | Parser |
|----------|-------|--------|--------|
| `ncUserToUser(ocs)` | OCS user data | `User` | Direct field mapping |
| `davToFile(response, basePath)` | WebDAV PROPFIND response | `File \| null` | XML property extraction |
| `ncTalkRoomToConversation(room)` | OCS Spreed room | `Conversation` | Type mapping (1→dm, 2/3→group) |
| `ncTalkMessageToMessage(msg, convId)` | OCS Spreed message | `Message` | Timestamp conversion |
| `icsToEvent(icalString, href)` | iCal VEVENT string | `Event \| null` | `ical.js` ICAL.parse |
| `vcardToContact(vcardString, href)` | vCard string | `Contact \| null` | `ical.js` ICAL.parse |
| `contactToVcard(contact)` | Partial `Contact` | vCard string | String concatenation |
| `eventToIcs(event, uid?)` | Partial `Event` | iCal string | String concatenation |
| `ncNoteToNote(json)` | Notes API JSON | `Note` | Direct field mapping |
| `deckBoardToBoard(json)` | Deck API JSON | `Board` | Color prefix fix (`#`) |
| `deckStackToStack(json)` | Deck API JSON | `Stack` | Direct field mapping |
| `deckCardToCard(json, boardId, stackId)` | Deck API JSON | `Card` | Assignee extraction |
| `ncMailToEmail(json, folder)` | Mail API JSON | `Email` | From/To array extraction |
| `ncActivityToActivity(json)` | Activity API JSON | `Activity` | Type classification |

### ID Generation

CalDAV and CardDAV resources don't have numeric IDs. The adapter generates deterministic numeric IDs by hashing the UID string:
```typescript
let hash = 0;
for (let i = 0; i < uid.length; i++) {
  hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
}
return Math.abs(hash) % 1000000;
```

---

## 20. Known Issues & Lessons Learned

### Hard-Won Lessons from the NC Integration

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Notes API returns empty `[]` | Notes app not installed in NC base image | `php occ app:install notes` — must be done manually after first boot |
| 2 | Seed script fails silently in Git Bash | Default `NC_BASE_URL=https://localhost` causes TLS failure with `curl -sk` on Windows | Override: `NC_BASE_URL="http://localhost:8080" bash seed/seed.sh` |
| 3 | Playwright tests fail — no data loads | Session cookie not established before tests run | Global setup file logs in via API, saves storageState to `playwright/.auth/session.json` |
| 4 | Tests assert on hardcoded names like "Rohan" | Tests were written for SQLite seed data, but NC adapter returns live data | Replace all name assertions with structural checks (`.first()`, count > 0) |
| 5 | Notes tests skip even though 51 notes exist | `networkidle` fires before React Query resolves the API call | Add `waitForResponse(r => r.url().includes("/api/notes"))` in beforeEach |
| 6 | `text=Upcoming Events` locator fails | Strict mode violation — matches both `<h3>Upcoming Events</h3>` and `<p>No upcoming events</p>` | Add `.first()` to ambiguous text locators |

### Architectural Constraints

- **In-memory caches are volatile**: The adapter caches (cardLookup, conversationTokens, etc.) are lost on server restart. The frontend naturally repopulates them via its initial GET requests on page load.
- **No real-time sync**: The adapter does not implement WebSocket/SSE. Polling via TanStack Query's `staleTime` is the only refresh mechanism.
- **Activity read state is local-only**: NC's Activity API has no read/unread concept. The `activityReadState` Map in `storage.ts` tracks this in-memory.
- **Mail counts are static**: `GET /api/emails/counts` returns `{ inbox: 0, drafts: 0, spam: 0 }` because computing real counts from the NC Mail API is expensive.
- **Media is fully mocked**: The Media page uses inline mock data (picsum.photos). No NC integration exists for photos/media.
