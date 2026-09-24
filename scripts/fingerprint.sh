#!/usr/bin/env bash
# Prints a single SHA-256 "fingerprint" of every file in a build folder.
#
# Usage: scripts/fingerprint.sh dist
#
# If even ONE byte in ONE file changes, the fingerprint changes.
# The pipeline uses this to PROVE that Development and Production received
# exactly the same build artifact. release.json is excluded because it is the
# file that stores the fingerprint itself.
set -euo pipefail
cd "${1:?usage: fingerprint.sh <folder>}"
find . -type f ! -name release.json -print0 \
  | sort -z \
  | xargs -0 sha256sum \
  | sha256sum \
  | cut -d' ' -f1
