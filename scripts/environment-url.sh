#!/usr/bin/env bash
# Prints the URL of the most recent SUCCESSFUL deployment to a GitHub
# Environment (e.g. "development"), using GitHub's Deployments API.
#
# Every job that uses `environment:` creates a deployment record, and the
# job's `environment.url` is saved on it. This is how the Promote and Abort
# workflows find "the current Development site" without hard-coding a URL.
#
# Usage: scripts/environment-url.sh <environment-name>
# Requires: GH_TOKEN and GITHUB_REPOSITORY; the job needs `deployments: read`.
set -euo pipefail
environment="${1:?environment name required}"

for id in $(gh api "repos/${GITHUB_REPOSITORY}/deployments?environment=${environment}&per_page=20" --jq '.[].id'); do
  url="$(gh api "repos/${GITHUB_REPOSITORY}/deployments/${id}/statuses" \
    --jq '[.[] | select(.state == "success")][0].environment_url // empty')"
  if [ -n "$url" ]; then
    echo "${url%/}/"
    exit 0
  fi
done

echo "No successful '${environment}' deployment found yet." >&2
exit 1
