#!/bin/bash
# inject-config.sh
# Applies post-init Nextcloud config via occ config:system:set.
# Run this AFTER the container is healthy (healthcheck passes).
# Usage: bash scripts/inject-config.sh [container_name]

set -euo pipefail

CONTAINER="${1:-nextcloud-backend-nextcloud-1}"

echo "▶ Waiting for Nextcloud to be healthy..."
MAX_WAIT=180
ELAPSED=0

until docker exec "$CONTAINER" curl -sf http://localhost/status.php \
    | grep -q '"installed":true'; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "✖ Timed out after ${MAX_WAIT}s. Check: docker logs $CONTAINER"
    exit 1
  fi
  echo "  ...waiting (${ELAPSED}s)"
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo "✔ Nextcloud is up. Applying config..."

OCC="docker exec -u 33 $CONTAINER php occ"

$OCC config:system:set auth.bruteforce.protection.enabled --value="true" --type=bool
$OCC config:system:set ratelimit.protection.enabled --value="true" --type=bool
$OCC config:system:set theme --value="headless"
$OCC config:system:set defaultapp --value=""
$OCC config:system:set trusted_proxies 0 --value="nginx"
$OCC config:system:set forwarded_for_headers 0 --value="HTTP_X_FORWARDED_FOR"

echo "▶ Disabling UI apps..."
UI_APPS=(dashboard firstrunwizard activity photos viewer theming survey_client
         recommendations weather_status user_status)

for app in "${UI_APPS[@]}"; do
  $OCC app:disable "$app" 2>/dev/null \
    && echo "  ✔ disabled: $app" \
    || echo "  ⚠ skipped (not installed): $app"
done

echo "▶ Installing oauth2 app..."
$OCC app:install oauth2 2>/dev/null || true
$OCC app:enable oauth2 2>/dev/null \
  && echo "  ✔ oauth2 enabled" \
  || echo "  ⚠ oauth2 enable failed — check manually"

echo ""
echo "✔ Config injection complete."
echo ""
echo "Next: register an OAuth2 client in Nextcloud Admin → Settings → Security → OAuth2"
echo "      Redirect URI: ${FRONTEND_URL:-http://localhost:3000}/auth/callback"
echo "      Enable PKCE checkbox."
