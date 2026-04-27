# Final Status

## Fully Working

- Auth via adapter login and encrypted server-side session storage
- Files via Nextcloud WebDAV
- Contacts via CardDAV
- Notes via WebDAV-backed note files
- Calendar via CalDAV
- Deck board loading and card workflows via Deck API
- Talk conversation loading and message send via Talk API
- Capability detection via `GET /api/capabilities`

## Partially Working

- Deck board creation is implemented and backend-backed, but it has had less browser validation than the core card flow
- Mail capability detection works, but live mail data depends on Mail app setup inside Nextcloud

## Depends On Nextcloud Apps

- Talk: requires Nextcloud Talk
- Boards / Cards: requires Nextcloud Deck
- Events: requires Calendar / CalDAV support
- Contacts: requires Contacts / CardDAV support
- Mail: requires Mail app plus mailbox configuration

## Known Limitations

- Notes are implemented as WebDAV-managed markdown files, not through a native Notes API
- Mail remains unavailable until the target Nextcloud user has a configured Mail account
- Talk message rendering now refetches after send; if the upstream Talk instance is slow, the message may appear after the refresh cycle rather than the same immediate paint

## Bottom Line

The staging build is operational for the core custom-frontend flows:
- login
- files
- contacts
- notes
- calendar
- deck cards
- talk messaging

The main remaining production caveats are app dependency management, external Mail setup, and the fact that Notes is a WebDAV compatibility layer.
