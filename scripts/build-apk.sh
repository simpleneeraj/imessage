#!/usr/bin/env bash
# Build the signed Android APK (Trusted Web Activity) for festhub.
#
# The TWA project lives OUTSIDE this repo at ~/festhub-twa. It wraps the live
# site (https://www.festhub.in) and bakes the launcher icon from the deployed
# web manifest — so DEPLOY first (icons/manifest must be live), then build.
#
# The keystore password is a secret and is never stored in the repo; pass it via
# env when running:
#   APK_KEYSTORE_PASSWORD=... APK_KEY_PASSWORD=... npm run build:apk
# (APK_KEY_PASSWORD defaults to APK_KEYSTORE_PASSWORD if unset.)
set -euo pipefail

TWA_DIR="${TWA_DIR:-$HOME/festhub-twa}"
OUT="${APK_OUT:-$HOME/Desktop/festhub.apk}"

if [[ ! -f "$TWA_DIR/twa-manifest.json" ]]; then
  echo "✗ TWA project not found at $TWA_DIR (set TWA_DIR to override)." >&2
  exit 1
fi
if [[ -z "${APK_KEYSTORE_PASSWORD:-}" ]]; then
  echo "✗ APK_KEYSTORE_PASSWORD is required (the android.keystore password)." >&2
  echo "  Usage: APK_KEYSTORE_PASSWORD=... npm run build:apk" >&2
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
