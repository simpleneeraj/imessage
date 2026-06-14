// Re-key the kept accounts from their OLD password (old tenant KDF identity)
// to a NEW 4-digit PIN, so the existing E2EE messages stay readable under the
// new single-space PIN login. Run locally:  node scripts/rekey.mjs
//
// It: (1) decrypts each stored private key with the old encKey, (2) re-encrypts
// it with the new PIN-derived encKey, (3) resets the account email to
// <username>@example.com and the auth password to the new PIN-derived password.
// Secrets are read from scripts/.rekey-secrets.json (gitignored) and never leave
// this machine.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const REF = 'yagdantmpfvkmqlgrhqj';
const APP_SALT = 'imsg-clone-e2ee-v1';
const PBKDF2_ITERATIONS = 310_000;
const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const b64 = (buf) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

// --- replicate lib/crypto.ts deriveKeys exactly ---
async function deriveKeys(username, password) {
  const material = await subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const masterBits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(`${APP_SALT}|${username.toLowerCase()}`), iterations: PBKDF2_ITERATIONS },
    material, 256,
  );
  const hkdfKey = await subtle.importKey('raw', masterBits, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const authBits = await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: te.encode(APP_SALT), info: te.encode('auth') }, hkdfKey, 256,
  );
  const encKey = await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: te.encode(APP_SALT), info: te.encode('enc') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
  return { authPassword: b64(authBits), encKey };
}

async function decryptPrivateKey(encB64, ivB64, encKey) {
  const pkcs8 = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, encKey, unb64(encB64));
  return subtle.importKey('pkcs8', pkcs8, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
}

async function encryptPrivateKey(privateKey, encKey) {
  const pkcs8 = await subtle.exportKey('pkcs8', privateKey);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, encKey, pkcs8);
  return { enc_private_key: b64(ct), iv: b64(iv) };
}

// --- management API helpers (token from the Supabase CLI keychain item) ---
const MGMT_TOKEN = execSync('security find-generic-password -s "Supabase CLI" -a supabase -w', { encoding: 'utf8' }).trim();
async function mgmt(path, opts = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}
const sql = (query) => mgmt('/database/query', { method: 'POST', body: JSON.stringify({ query }) });

async function main() {
  const secrets = JSON.parse(readFileSync(new URL('./.rekey-secrets.json', import.meta.url)));
  const url = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1]
    .trim()
    .replace(/^["']|["']$/g, '');

  // service_role key for auth admin (email/password reset) — revealed via mgmt API
  const keys = await mgmt('/api-keys?reveal=true');
  const serviceKey = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('could not get service_role key');
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const acc of secrets.accounts) {
    const { username, oldPassword, pin } = acc;
    const oldIdentity = acc.oldIdentity ?? `our:${username}`;
    process.stdout.write(`\n[${username}] `);

    // resolve user id
    const rows = await sql(`select id from public.profiles where lower(username)=lower('${username.replace(/'/g, "''")}');`);
    if (!rows[0]) throw new Error(`no profile for ${username}`);
    const id = rows[0].id;

    // fetch the encrypted private-key backup
    const ukRows = await sql(`select enc_private_key, iv from public.user_keys where user_id='${id}';`);
    if (!ukRows[0]) throw new Error(`no user_keys for ${username}`);

    // decrypt with OLD encKey, re-encrypt with NEW encKey
    const oldKeys = await deriveKeys(oldIdentity, oldPassword);
    let privateKey;
    try {
      privateKey = await decryptPrivateKey(ukRows[0].enc_private_key, ukRows[0].iv, oldKeys.encKey);
    } catch {
      throw new Error(`wrong OLD password for ${username} (could not decrypt private key)`);
    }
    const newKeys = await deriveKeys(username, pin);
    const reenc = await encryptPrivateKey(privateKey, newKeys.encKey);

    // persist the re-encrypted backup
    await admin.from('user_keys').update({ enc_private_key: reenc.enc_private_key, iv: reenc.iv }).eq('user_id', id);
    process.stdout.write('key re-encrypted · ');

    // reset email + auth password to the new PIN-derived values
    const { error } = await admin.auth.admin.updateUserById(id, {
      email: `${username.toLowerCase()}@example.com`,
      password: newKeys.authPassword,
      email_confirm: true,
    });
    if (error) throw new Error(`auth update failed for ${username}: ${error.message}`);
    process.stdout.write('email+password reset ✓');
  }

  console.log('\n\nDone. Both accounts can now sign in with name + their new 4-digit PIN, and old messages decrypt.');
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
