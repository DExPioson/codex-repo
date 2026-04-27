# Staging Smoke Results

Smoke verification was run on April 24, 2026 against:

- Frontend: `http://localhost:5173`
- Adapter API: `http://localhost:5000`
- Nextcloud: `http://localhost:8090`
- Test user: local `admin`

## Status By Module

Module: Auth
- Login: `PASS`
- Session restore: `PASS`
- Logout: `PASS`

Module: Files
- List: `PASS`
- Create folder: `PASS`
- Upload: `PASS`
- Download: `PASS`
- Delete: `PASS`
- Reload consistency: `PASS`

Module: Contacts
- Fetch: `PASS`
- Create: `PASS`
- Refresh persistence: `PASS`
- Delete: `PASS`

Module: Notes
- Fetch: `PASS`
- Create: `PASS`
- Edit immediately after create: `PASS`
- Reload persistence: `PASS`
- Delete: `PASS`

Module: Calendar
- Fetch: `PASS`
- Create event: `PASS`
- Refresh persistence: `PASS`
- Delete event: `PASS`

Module: Deck
- Auto-select first board: `PASS`
- Empty-state handling when no board is selected: `PASS`
- Open board: `PASS`
- Create card: `PASS`
- Reload persistence: `PASS`
- Delete card: `PASS`
- Create board via API: `PASS`
- Create board via browser UI: `NOT RE-VERIFIED IN THIS PASS`

Module: Talk
- Load conversations: `PASS`
- Load messages: `PASS`
- Send message via adapter/API: `PASS`
- Send message via browser UI: `PASS`
- Reload consistency: `PASS`

Module: Mail
- Capability detection: `PASS`
- Mail data flow: `BLOCKED`
- Reason: local Nextcloud user has no Mail account configured

## What Was Verified

### Files

Real adapter/API validation:
- Created a real WebDAV folder under `/`
- Uploaded 3 files with different types:
  - `alpha.txt`
  - `beta.json`
  - `gamma.bin`
- Re-fetched the folder and confirmed all 3 files were listed
- Downloaded `beta.json` and verified file contents
- Deleted all 3 files
- Re-fetched the folder and confirmed it was empty

Browser validation:
- Updated and ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\04-files.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\04-files.spec.ts)
- Result: `3 passed`

### Contacts

Real adapter/API validation:
- Created a CardDAV contact with valid VCF-backed data
- Re-fetched contacts and confirmed the contact existed

Browser validation:
- Ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\08-contacts.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\08-contacts.spec.ts)
- Result: `6 passed`

### Notes

Real adapter/API validation:
- Created a note
- Updated its title and body immediately after create
- Re-fetched notes and confirmed the same note ID persisted after rename

Browser validation:
- Ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\07-notes.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\07-notes.spec.ts)
- Result: `5 passed`

### Calendar

Browser validation:
- Ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\06-calendar.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\06-calendar.spec.ts)
- Result: `5 passed`

### Deck

Real adapter/API validation:
- Loaded boards and board detail from real Deck
- Used the first board and first stack
- Created a real card
- Re-fetched the board and confirmed the card existed

Browser validation:
- Ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\09-deck.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\09-deck.spec.ts)
- Result: `5 passed`

### Talk

Real adapter/API validation:
- Loaded real Talk conversations
- Loaded real message history
- Sent a real message to a writable conversation
- Re-fetched messages and confirmed the message existed

Browser validation:
- Ran [C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend\e2e\05-talk.spec.ts](C:\Users\admin\Desktop\Codex%20New%20Implementation\NextCloud-Frontend\e2e\05-talk.spec.ts)
- Result: `3 passed`

## Current Deployment Truth

Safe to stage:
- Auth
- Files
- Contacts
- Notes
- Calendar
- Deck card flow

Needs one more reliability pass before calling fully complete:
- Deck board creation browser flow re-verification

Blocked by external app configuration:
- Mail

## Commands Used

Type check:

```powershell
cd "C:\Users\admin\Desktop\Codex New Implementation\NextCloud-Frontend"
npm run check
```

Focused browser smoke runs:

```powershell
$env:E2E_EMAIL='<e2e-user>'
$env:E2E_PASSWORD='<e2e-password>'
npx playwright test e2e/04-files.spec.ts --project=chromium --reporter=line
npx playwright test e2e/06-calendar.spec.ts --project=chromium --reporter=line
npx playwright test e2e/07-notes.spec.ts --project=chromium --reporter=line
npx playwright test e2e/08-contacts.spec.ts --project=chromium --reporter=line
npx playwright test e2e/09-deck.spec.ts --project=chromium --reporter=line
```

Talk browser smoke:

```powershell
$env:E2E_EMAIL='<e2e-user>'
$env:E2E_PASSWORD='<e2e-password>'
npx playwright test e2e/05-talk.spec.ts --project=chromium --reporter=line
```

## Remaining Limitation

The main remaining limitation is environmental, not core-flow correctness:
- Mail still requires external Nextcloud Mail configuration
- Notes are WebDAV-backed rather than using a native Notes API
- Deck board creation has less browser validation than the main card flow
