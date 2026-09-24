#!/usr/bin/env bash
# Deploys an ALREADY-BUILT folder to a Vercel project — without rebuilding.
#
# Usage: scripts/deploy-vercel.sh <build-folder>
#
# Required environment variables (set by the workflow from GitHub):
#   VERCEL_TOKEN       secret   - lets the Vercel CLI act on your account
#   VERCEL_ORG_ID      variable - your Vercel team/account ID
#   VERCEL_PROJECT_ID  variable - WHICH Vercel project (dev or prod) to deploy to
# Optional:
#   APP_URL            the site's public URL; discovered automatically if empty
#
# HOW "NO REBUILD" WORKS
# Normally Vercel builds your source code on its own servers. We don't want
# that: we already built and tested react-build-artifact. Vercel's
# "Build Output API" lets us hand it finished files instead:
#
#   .vercel/output/config.json   -> {"version": 3}
#   .vercel/output/static/...    -> our dist/ files, served as-is
#
# `vercel deploy --prebuilt` uploads exactly those files. Vercel does not run
# npm install or npm run build.
#
# Prints the public URL (with trailing slash) as the LAST line of stdout.
set -euo pipefail

src="${1:?usage: deploy-vercel.sh <build-folder>}"
src="$(cd "$src" && pwd)"
cli_version="${VERCEL_CLI_VERSION:-59}"

for var in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  if [ -z "${!var:-}" ]; then
    echo "::error title=Missing configuration::${var} is not set for this environment. See README → Setup → step 4." >&2
    exit 1
  fi
done

# 1. Wrap the artifact in Vercel's Build Output API layout (a copy — the
#    original folder is untouched).
work="$(mktemp -d)"
mkdir -p "$work/.vercel/output/static"
cp -R "$src"/. "$work/.vercel/output/static/"
echo '{"version":3}' > "$work/.vercel/output/config.json"

# 2. Upload and make it the project's production deployment.
#    The CLI reads VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID from the
#    environment, so the token never appears on the command line.
#    It prints progress to stderr and the deployment URL to stdout.
cd "$work"
deployment_url="$(npx --yes "vercel@${cli_version}" deploy --prebuilt --prod --yes)"
echo "Vercel deployment: ${deployment_url}" >&2

# 3. Find the stable public URL. Each deployment gets its own unique URL
#    (e.g. cicd-demo-dev-8f3k2.vercel.app), which Vercel protects by default.
#    The stable production domain (e.g. cicd-demo-dev.vercel.app) is public and
#    always points at the newest production deployment — that's what we test.
if [ -n "${APP_URL:-}" ]; then
  public_url="${APP_URL%/}/"
else
  query=""
  if [[ "$VERCEL_ORG_ID" == team_* ]]; then query="?teamId=${VERCEL_ORG_ID}"; fi
  aliases="$(curl -fsS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "https://api.vercel.com/v13/deployments/${deployment_url#https://}${query}" |
    jq -r '.alias // [] | .[]')"
  echo "Domains assigned to this deployment:" >&2
  echo "${aliases:-  (none)}" >&2
  shortest="$(echo "$aliases" | awk 'NF { print length, $0 }' | sort -n | head -1 | cut -d' ' -f2-)"
  if [ -z "$shortest" ]; then
    echo "::error title=No public domain::Vercel assigned no domain. Set the APP_URL variable for this environment (README → Setup → step 4)." >&2
    exit 1
  fi
  public_url="https://${shortest}/"
fi

echo "Public URL: ${public_url}" >&2
echo "$public_url"
