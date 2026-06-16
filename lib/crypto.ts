// E2EE primitives. Pure WebCrypto, no dependencies.
//
// Scheme (v1):
// - password → PBKDF2-SHA256(310k, salt = APP_SALT|username) → 256-bit master
//   → HKDF split into authKey (sent to Supabase as the account password) and
//   encKey (device-only; encrypts the private-key backup). The server never
//   sees the real password, so the key backup it stores stays opaque to it.
// - identity: ECDH P-256 (chosen over X25519 for universal WebCrypto support).
// - per-conversation AES-256-GCM key, wrapped per participant with
//   ECDH(static, static) → HKDF → AES-GCM. Static-static is what makes full
//   history recoverable from any device after login (no forward secrecy).
// - message envelope: {"v":1,"iv","ct"} with AAD = conversation_id.

export const KDF_VERSION = 1;
export const PBKDF2_ITERATIONS = 310_000;
const APP_SALT = "imsg-clone-e2ee-v1";
const CONV_WRAP_INFO = "imsg-conv-wrap-v1";

const te = new TextEncoder();
const td = new TextDecoder();

export function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function randomIv(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(12));
}

// ---------- password split ----------

export type DerivedKeys = {
  /** base64; this string is the Supabase account password. */
  authPassword: string;
  /** AES-GCM key for the private-key backup. Never persisted. */
  encKey: CryptoKey;
};

export async function deriveKeys(
  username: string,
  password: string
): Promise<DerivedKeys> {
  const material = await crypto.subtle.importKey(
    "raw",
    te.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const masterBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: te.encode(`${APP_SALT}|${username.toLowerCase()}`),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    256
  );
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    masterBits,
    "HKDF",
    false,
    ["deriveBits", "deriveKey"]
  );
  const authBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: te.encode(APP_SALT), info: te.encode("auth") },
    hkdfKey,
    256
  );
  const encKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: te.encode(APP_SALT), info: te.encode("enc") },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return { authPassword: toB64(authBits), encKey };
}

// ---------- identity key pair ----------

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return toB64(await crypto.subtle.exportKey("spki", key));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromB64(b64),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function exportEncryptedPrivateKey(
  privateKey: CryptoKey,
  encKey: CryptoKey
): Promise<{ enc_private_key: string; iv: string }> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = randomIv();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, pkcs8);
  return { enc_private_key: toB64(ct), iv: toB64(iv) };
}

export async function decryptImportPrivateKey(
  encPrivateKeyB64: string,
  ivB64: string,
  encKey: CryptoKey
): Promise<CryptoKey> {
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    encKey,
    fromB64(encPrivateKeyB64)
  );
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
}

// ---------- conversation key wrap/unwrap ----------

async function deriveWrapKey(
  myPrivate: CryptoKey,
  theirPublic: CryptoKey,
  conversationId: string
): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublic },
    myPrivate,
    256
  );
  const hkdfKey = await crypto.subtle.importKey("raw", shared, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: te.encode(conversationId),
      info: te.encode(CONV_WRAP_INFO),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function generateConvKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function wrapConvKey(
  convKey: CryptoKey,
  myPrivate: CryptoKey,
  recipientPublicB64: string,
  conversationId: string
): Promise<{ wrapped_key: string; iv: string }> {
  const wrapKey = await deriveWrapKey(
    myPrivate,
    await importPublicKey(recipientPublicB64),
    conversationId
  );
  const raw = await crypto.subtle.exportKey("raw", convKey);
  const iv = randomIv();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, raw);
  return { wrapped_key: toB64(ct), iv: toB64(iv) };
}

export async function unwrapConvKey(
  wrappedKeyB64: string,
  ivB64: string,
  myPrivate: CryptoKey,
  wrapperPublicB64: string,
  conversationId: string
): Promise<CryptoKey> {
  // ECDH is symmetric: ECDH(myPriv, wrapperPub) == ECDH(wrapperPriv, myPub)
  const wrapKey = await deriveWrapKey(
    myPrivate,
    await importPublicKey(wrapperPublicB64),
    conversationId
  );
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) },
    wrapKey,
    fromB64(wrappedKeyB64)
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ---------- message envelope ----------

export type MessagePayload =
  | { kind: "text"; text: string; inCall?: boolean }
  | {
      kind: "expression";
      id: string;
      text: string;
      effect: "hearts" | "confetti" | "none";
    }
  | {
      kind: "file";
      name: string;
      mime: string;
      size: number;
      path: string;
      fk: string; // base64 file key
      fiv: string; // base64 file IV
      w?: number;
      h?: number;
    }
  | {
      kind: "call";
      media: "audio" | "video";
      // completed = connected then ended; missed = never connected
      outcome: "completed" | "missed";
      duration: number; // seconds (0 when missed)
    };

type Envelope = { v: number; iv: string; ct: string };

export function isEnvelope(body: string): boolean {
  if (!body.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(body) as Partial<Envelope>;
    return (
      typeof parsed.v === "number" &&
      typeof parsed.iv === "string" &&
      typeof parsed.ct === "string"
    );
  } catch {
    return false;
  }
}

export async function encryptEnvelope(
  payload: MessagePayload,
  convKey: CryptoKey,
  conversationId: string
): Promise<string> {
  const iv = randomIv();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: te.encode(conversationId) },
    convKey,
    te.encode(JSON.stringify(payload))
  );
  const envelope: Envelope = { v: 1, iv: toB64(iv), ct: toB64(ct) };
  return JSON.stringify(envelope);
}

export async function decryptEnvelope(
  body: string,
  convKey: CryptoKey,
  conversationId: string
): Promise<MessagePayload> {
  const envelope = JSON.parse(body) as Envelope;
  const pt = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromB64(envelope.iv),
      additionalData: te.encode(conversationId),
    },
    convKey,
    fromB64(envelope.ct)
  );
  return JSON.parse(td.decode(pt)) as MessagePayload;
}

// ---------- file encryption ----------

export async function encryptFile(
  data: ArrayBuffer
): Promise<{ cipher: ArrayBuffer; fk: string; fiv: string }> {
  const fileKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = randomIv();
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    fileKey,
    data
  );
  return {
    cipher,
    fk: toB64(await crypto.subtle.exportKey("raw", fileKey)),
    fiv: toB64(iv),
  };
}

export async function decryptFile(
  cipher: ArrayBuffer,
  fkB64: string,
  fivB64: string
): Promise<ArrayBuffer> {
  const fileKey = await crypto.subtle.importKey(
    "raw",
    fromB64(fkB64),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(fivB64) },
    fileKey,
    cipher
  );
}
