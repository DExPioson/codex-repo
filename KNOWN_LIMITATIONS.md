# Known Limitations

- Talk messages rely on a post-send refetch for consistency. If the Talk backend is slow, a new message may appear after the refresh cycle instead of the very first paint.
- Mail requires external mailbox configuration inside Nextcloud Mail before inbox data or compose flows can work.
- Notes are WebDAV-based markdown files stored in Nextcloud files, not a native Notes API integration.
- Deck functionality depends on the Deck app being installed and available.
- Contacts functionality depends on CardDAV address book availability for the logged-in user.
