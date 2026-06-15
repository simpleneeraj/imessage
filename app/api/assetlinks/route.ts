// Digital Asset Links for the TWA Android app. Served at
// /.well-known/assetlinks.json (via a rewrite in next.config). Verifies the APK
// owns festhub.in → hides the URL bar AND lets Web Push show as native Android
// notifications (notification delegation).
//
// Two relations are required:
//   1. handle_all_urls  — proves URL ownership (hides Chrome address bar)
//   2. use_as_origin    — grants the TWA permission to act as the web origin,
//                         which enables push-notification delegation so
//                         notifications appear as native Android notifications
//                         instead of Chrome browser notifications.
//
// Values are public (this file must be world-readable) but kept in env so you
// can drop in the signing fingerprint without a code change:
//   ANDROID_PACKAGE_NAME   e.g. in.festhub.app
//   ANDROID_APP_SHA256     SHA-256 fingerprint(s), comma-separated
//                          (from `bubblewrap fingerprint`; add the Play
//                           App-Signing key too once published)

export const dynamic = 'force-dynamic';

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME ?? 'in.festhub.app';
  const fingerprints = (process.env.ANDROID_APP_SHA256 ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const target = {
    namespace: 'android_app',
    package_name: packageName,
    sha256_cert_fingerprints: fingerprints,
  };

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target,
    },
    {
      relation: ['delegate_permission/common.use_as_origin'],
      target,
    },
  ];

  return Response.json(body, {
    headers: {
      'Content-Type': 'application/json',
      // Chrome caches DAL for up to 24 h; keep a short max-age so fingerprint
      // updates propagate quickly while still being cacheable for perf.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
