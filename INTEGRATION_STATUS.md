# Integration Status

This matrix reflects the current state of the custom frontend integration in `codex-repo`, with `NextCloud-Frontend` acting as the custom UI and adapter layer in front of the Nextcloud backend.

| Module | Backend Type | Depends On | Status |
|--------|-------------|------------|--------|
| Auth | OCS + delegated app password bootstrap | Nextcloud core | ✅ Real |
| Files | WebDAV | Nextcloud core | ✅ Real |
| Dashboard | Wrapper over real files/user plus optional mock aggregates | Core + adapter composition | 🟡 Mixed |
| Conversations | Talk OCS API | `spreed` app | ⚠️ Depends |
| Talk Messages | Talk chat OCS API | `spreed` app | ⚠️ Depends |
| Talk Calls | Custom in-adapter signaling state | Adapter only | 🟡 Custom |
| Boards | Deck REST API | `deck` app | ⚠️ Depends |
| Cards | Deck REST API | `deck` app | ⚠️ Depends |
| Events | CalDAV | `calendar` app | ⚠️ Depends |
| Contacts | CardDAV | `contacts` app | ⚠️ Depends |
| Notes | WebDAV markdown wrapper in `/Notes` | Files/WebDAV | 🟡 Custom |
| Email List / Counts / Detail | Mail REST API | `mail` app + per-user mail account config | ❗ Risky |
| Email Compose / Send | Mail drafts/outbox REST API | `mail` app + SMTP/IMAP account config | ❗ Risky |
| Activity | Mock storage | Adapter only | ❌ Not real |

## Definitions

- `✅ Real`: directly backed by a real Nextcloud API or DAV surface.
- `⚠️ Depends`: real integration, but only works when the required Nextcloud app is installed and enabled.
- `🟡 Custom`: intentionally implemented in the adapter, using Nextcloud primitives rather than a dedicated official app API.
- `❗ Risky`: real upstream integration exists, but availability also depends on user-specific configuration, not just app installation.
- `❌ Not real`: still mock-backed and not suitable for production validation.

## Current capability behavior

- Adapter capability detection is exposed at `GET /api/capabilities`.
- App availability is detected from Nextcloud installed apps via `ocs/v2.php/cloud/apps`.
- Mail is additionally treated as unavailable unless the current user has a configured Mail account.
- Frontend navigation now disables unavailable modules instead of letting them fail noisily.

## QA notes

- A successful login does not guarantee every module is usable.
- For Talk, Deck, Calendar, and Contacts, the related Nextcloud apps must be enabled.
- For Mail, the `mail` app must be enabled and the logged-in user must have a configured mail account.
- Notes currently rely on the adapter-managed WebDAV folder approach, not the separate Nextcloud Notes app.
