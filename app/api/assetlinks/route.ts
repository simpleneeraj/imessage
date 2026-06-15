// Digital Asset Links for the TWA Android app. Served at
// /.well-known/assetlinks.json (via a rewrite in next.config). Verifies the APK
// owns festhub.in → hides the URL bar AND lets Web Push show as native Android
// notifications (notification delegation).
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

  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return Response.json(body, {
    headers: { 'Content-Type': 'application/json' },
  });
}
