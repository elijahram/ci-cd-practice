#!/usr/bin/env bash
# Verifies that a deployed site answers with HTTP 200.
# Usage: scripts/health-check.sh <url>
set -euo pipefail
url="${1:?url required}"

for attempt in 1 2 3 4 5; do
  # A unique query string bypasses the GitHub Pages CDN cache.
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${url}?health=$(date +%s)" || echo "000")
  echo "Attempt ${attempt}: ${url} -> HTTP ${code}"
  if [ "$code" = "200" ]; then
    echo "✅ Healthy"
    exit 0
  fi
  sleep 10
done

echo "❌ ${url} is not healthy (expected HTTP 200)"
exit 1
