#!/usr/bin/env bash
# Build the signed Android APK (Trusted Web Activity) for festhub.
#
# The TWA project lives OUTSIDE this repo at ~/Ideas/festhub-app. It wraps the live
# site (https://www.festhub.in) and bakes the launcher icon from the deployed
# web manifest — so DEPLOY first (icons/manifest must be live), then build.
#
# The keystore password is read from the repo's gitignored .env (or the
# environment if already set). Add this line to .env:
#   APK_KEYSTORE_PASSWORD=your-keystore-password
# (APK_KEY_PASSWORD is optional and defaults to APK_KEYSTORE_PASSWORD.)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TWA_DIR="${TWA_DIR:-$HOME/Ideas/festhub-app}"
OUT="${APK_OUT:-$HOME/Desktop/festhub.apk}"

# Load secrets from .env without echoing them (only if not already in the env).
if [[ -z "${APK_KEYSTORE_PASSWORD:-}" && -f "$REPO_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_DIR/.env"
  set +a
fi

if [[ ! -f "$TWA_DIR/twa-manifest.json" ]]; then
  echo "✗ TWA project not found at $TWA_DIR (set TWA_DIR to override)." >&2
  exit 1
fi
if [[ -z "${APK_KEYSTORE_PASSWORD:-}" ]]; then
  echo "✗ APK_KEYSTORE_PASSWORD not found. Add it to $REPO_DIR/.env:" >&2
  echo "    APK_KEYSTORE_PASSWORD=your-keystore-password" >&2
  exit 1
fi

# Bubblewrap reads these for non-interactive signing.
export BUBBLEWRAP_KEYSTORE_PASSWORD="$APK_KEYSTORE_PASSWORD"
export BUBBLEWRAP_KEY_PASSWORD="${APK_KEY_PASSWORD:-$APK_KEYSTORE_PASSWORD}"

cd "$TWA_DIR"

# Pull the latest deployed manifest/icons into the Android project, then build.
# Answer the "regenerate the Android project?" prompt with "no" to keep our
# tuned twa-manifest.json (splash duration, package id, notifications) intact.
printf 'no\n' | bubblewrap build

cp -f "$TWA_DIR/app-release-signed.apk" "$OUT"
echo "✓ Signed APK → $OUT"
