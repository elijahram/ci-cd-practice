#!/usr/bin/env bash
# Waits until a deployed site is actually serving a specific release.
#
# GitHub Pages takes ~30-90 seconds to publish, and its CDN may keep serving
# the old version for a short time. We poll <url>/release.json (written by the
# "Build Application" job) until its "sha" matches the commit we deployed.
#
# Usage: scripts/wait-for-release.sh <url-with-trailing-slash> <sha> [timeout-seconds]
set -euo pipefail
url="${1:?url required}"
expected_sha="${2:?sha required}"
timeout="${3:-600}"
deadline=$(($(date +%s) + timeout))

while true; do
  body_file="$(mktemp)"
  status=$(curl -sS --max-time 20 -H 'Cache-Control: no-cache' -o "$body_file" -w '%{http_code}' \
    "${url}release.json?nocache=$(date +%s%N)" 2>/dev/null || echo "000")
  served_sha=$(jq -r '.sha // empty' "$body_file" 2>/dev/null || true)
  rm -f "$body_file"

  if [ "$served_sha" = "$expected_sha" ]; then
    echo "✅ ${url} is serving release ${expected_sha:0:7}"
    exit 0
  fi

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "❌ Timed out after ${timeout}s. Expected ${expected_sha:0:7}, site is serving '${served_sha:-nothing}' (last HTTP status: ${status})"
    if [ "$status" = "401" ] || [ "$status" = "403" ]; then
      echo "   HTTP ${status} means the URL is behind Vercel's login (Deployment Protection)."
      echo "   Use the project's public production domain, or set APP_URL for this environment."
    fi
    exit 1
  fi

  echo "⏳ Waiting for ${url} to serve ${expected_sha:0:7} (currently '${served_sha:-nothing yet}', HTTP ${status})..."
  sleep 15
done