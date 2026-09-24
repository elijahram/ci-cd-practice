#!/usr/bin/env bash
# Reads and writes the "release-control" commit status on a release commit.
#
# WHY: the soak job, the "Promote" workflow and the "Abort" workflow run as
# separate GitHub Actions runs. They need one shared place to agree on the
# state of a release. We use a GitHub *commit status* (the same mechanism that
# shows green checks / red X's next to commits). Bonus: you can SEE the state
# next to the commit on GitHub.
#
#   pending  = release is soaking in Development
#   failure  = release was ABORTED on purpose (or superseded by a newer one)
#   success  = release was promoted to Production
#   error    = promotion to Production was attempted but failed
#
# Usage:
#   scripts/release-status.sh get <sha>                        -> prints state or "none"
#   scripts/release-status.sh describe <sha>                   -> prints description
#   scripts/release-status.sh set <sha> <state> <description>
#
# Requires: GH_TOKEN and GITHUB_REPOSITORY env vars (set automatically in Actions).
set -euo pipefail

CONTEXT="release-control"
command="${1:?command required}"
sha="${2:?commit sha required}"

latest() {
  # GitHub returns statuses newest-first, so [0] is the current one.
  gh api "repos/${GITHUB_REPOSITORY}/commits/${sha}/statuses" \
    --jq "[.[] | select(.context == \"${CONTEXT}\")][0] | if . == null then \"none\" else .${1} end"
}

case "$command" in
  get) latest state ;;
  describe) latest description ;;
  set)
    state="${3:?state required}"
    description="${4:?description required}"
    gh api --method POST "repos/${GITHUB_REPOSITORY}/statuses/${sha}" \
      -f state="$state" \
      -f context="$CONTEXT" \
      -f description="${description:0:140}" \
      -f target_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}" \
      >/dev/null
    echo "release-control for ${sha:0:7} is now '${state}': ${description:0:140}"
    ;;
  *)
    echo "Unknown command: $command" >&2
    exit 2
    ;;
esac
