// Per-chat passcode gate. The 4-digit code is hashed with PBKDF2 (salted by
// conversation id) and the hash stored on the user's own participant row —
// an access gate on top of E2EE, not an encryption layer.

export async function hashPasscode(
  code: string,
  conversationId: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(`monarch-passcode-v1:${conversationId}`),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
