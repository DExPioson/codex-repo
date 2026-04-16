# Playwright Known Issues

## Notes App Dependency

The Notes tests require the Nextcloud Notes app to be installed and seeded.
If the 3 notes tests (Select, Delete, Pin/unpin) skip at runtime, it means
no notes exist for the test user.

### Fix

```bash
# Install the Notes app if missing
docker exec -u www-data cloudspace-backend-nextcloud-1 php occ app:install notes

# Re-seed notes (from cloudspace-backend/)
NC_BASE_URL="http://localhost:8080" bash seed/seed_notes_only.sh
```

The notes seed must use `http://` (not `https://`) because the container
serves plain HTTP on port 8080.
