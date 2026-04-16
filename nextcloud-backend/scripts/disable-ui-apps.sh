#!/bin/bash
# Deprecated wrapper - delegates to inject-config.sh
echo "ℹ  disable-ui-apps.sh now delegates to inject-config.sh"
exec "$(dirname "$0")/inject-config.sh" "$@"
