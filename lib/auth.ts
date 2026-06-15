import { supabase } from './supabase';
import { idb, destroyDb } from './idb';
import { clearKeyCache } from './keys';
import {
  KDF_VERSION,
  PBKDF2_ITERATIONS,
  deriveKeys,
  decryptImportPrivateKey,
  exportEncryptedPrivateKey,
  exportPublicKey,
  generateIdentityKeyPair,
} from './crypto';
import slugify from 'slugify';
import { disablePush } from './push';
import type { Profile } from './types';

// Synthetic domain for username->email mapping. Must pass GoTrue's email
// validation; example.com is RFC-reserved so nothing is ever deliverable, and
// with "Confirm email" disabled nothing is ever sent.
const EMAIL_DOMAIN = 'example.com';
export const USERNAME_RE = /^[a-zA-Z0-9_]{2,24}$/;
// Login secret is a 4-digit PIN (it also derives the E2EE keys).
export const PIN_RE = /^\d{4}$/;

export type AuthResult =
  | { ok: true; profile: Profile }
  // `code: 'exists'`      = the account is already registered (→ try sign-in).
  // `code: 'auth-failed'` = wrong PIN or no such account (→ try sign-up).
  // No code on other failures = authenticated but couldn't finish (surface it).
  | { ok: false; error: string; code?: 'exists' | 'auth-failed' };

// A person's display name IS their identity: the username is slugify(name) with
// '_' separators so it matches USERNAME_RE. Returns null if the name has no
// usable letters/numbers (e.g. emoji-only).
export function slugifyUsername(name: string): string | null {
  const u = slugify(name ?? '', { lower: true, strict: true, replacement: '_' })
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
    .replace(/_+$/g, '');
  return USERNAME_RE.test(u) ? u : null;
}

function syntheticEmail(username: string): string {
  return `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
}

async function persistLocal(profile: Profile, privateKey: CryptoKey) {
  await idb.kvSet('profile', profile);
  await idb.kvSet('privateKey', privateKey);
}

type Derived = { authPassword: string; encKey: CryptoKey };

// Create a brand-new account.
async function attemptSignUp(
  name: string,
  username: string,
  { authPassword, encKey }: Derived,
): Promise<AuthResult> {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: syntheticEmail(username),
    password: authPassword,
  });
  if (signUpError) {
    // The account already exists → caller falls back to sign-in.
    if (/already registered/i.test(signUpError.message)) {
      return { ok: false, error: 'That name is already taken.', code: 'exists' };
    }
    return { ok: false, error: signUpError.message };
  }
  const userId = signUpData.user?.id;
  if (!userId || !signUpData.session) {
    return {
      ok: false,
      error:
        'Sign-up did not return a session. Make sure email confirmations are disabled in Supabase.',
    };
  }

  const keyPair = await generateIdentityKeyPair();
  const publicKey = await exportPublicKey(keyPair.publicKey);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username,
      display_name: name.trim(),
      public_key: publicKey,
    })
    .select()
    .single();
  if (profileError) {
    return {
      ok: false,
      error:
        profileError.code === '23505'
          ? 'That name is already taken.'
          : profileError.message,
    };
  }

  const backup = await exportEncryptedPrivateKey(keyPair.privateKey, encKey);
  const { error: keyError } = await supabase.from('user_keys').insert({
    user_id: userId,
    ...backup,
    kdf_version: KDF_VERSION,
    kdf_iterations: PBKDF2_ITERATIONS,
  });
  if (keyError) return { ok: false, error: keyError.message };

  await persistLocal(profile as Profile, keyPair.privateKey);
  await supabase.realtime.setAuth();
  return { ok: true, profile: profile as Profile };
}

// Log a returning member back in (restores their E2EE keys from the backup).
async function attemptSignIn(
  username: string,
  { authPassword, encKey }: Derived,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(username),
    password: authPassword,
  });
  if (error || !data.user) {
    // Wrong PIN OR no such account — caller falls back to sign-up.
    return { ok: false, error: 'Wrong PIN.', code: 'auth-failed' };
  }
  const userId = data.user.id;

  // Different account previously used on this device → wipe its local data.
  const localProfile = await idb.kvGet<Profile>('profile');
  if (localProfile && localProfile.id !== userId) {
    clearKeyCache();
    await destroyDb();
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: 'Could not load your profile.' };
  }

  const { data: keyRow } = await supabase
    .from('user_keys')
    .select('enc_private_key, iv')
    .eq('user_id', userId)
    .maybeSingle();

  let privateKey: CryptoKey;
  if (keyRow) {
    try {
      privateKey = await decryptImportPrivateKey(
        keyRow.enc_private_key,
        keyRow.iv,
        encKey,
      );
    } catch {
      return {
        ok: false,
        error: 'Could not unlock your encryption keys with that PIN.',
      };
    }
  } else {
    // Interrupted signup left no backup: start a fresh identity. Old
    // conversations stay undecryptable ("Unable to decrypt").
    const keyPair = await generateIdentityKeyPair();
    const publicKey = await exportPublicKey(keyPair.publicKey);
    await supabase
      .from('profiles')
      .update({ public_key: publicKey })
      .eq('id', userId);
    const backup = await exportEncryptedPrivateKey(keyPair.privateKey, encKey);
    await supabase.from('user_keys').insert({
      user_id: userId,
      ...backup,
      kdf_version: KDF_VERSION,
      kdf_iterations: PBKDF2_ITERATIONS,
    });
    privateKey = keyPair.privateKey;
  }

  await persistLocal(profile as Profile, privateKey);
  await supabase.realtime.setAuth();
  return { ok: true, profile: profile as Profile };
}

// Single entry point: have an account → log in; don't → create one. The name
// is the identity (username = slugify(name)).
//
// We sign IN first, then fall back to sign-up. Signing in never trips signup
// errors, so a returning member always gets back in; only a genuinely new
// account reaches sign-up.
export async function authenticate(
  name: string,
  pin: string,
): Promise<AuthResult> {
  const username = slugifyUsername(name);
  if (!username) {
    return {
      ok: false,
      error: 'Please enter a name with at least 2 letters or numbers.',
    };
  }
  if (!PIN_RE.test(pin)) {
    return { ok: false, error: 'Enter your 4-digit PIN.' };
  }

  // PBKDF2 is expensive — derive once and reuse for whichever path we take.
  const derived = await deriveKeys(username, pin);

  // Returning member → straight in.
  const signedIn = await attemptSignIn(username, derived);
  if (signedIn.ok) return signedIn;
  // Authenticated but couldn't finish (e.g. broken profile/keys) → surface it;
  // don't fall through to sign-up and mislabel it as a wrong PIN.
  if (signedIn.code !== 'auth-failed') return signedIn;

  // Auth failed: either the account doesn't exist yet (→ create it) or the PIN
  // is wrong. attemptSignUp distinguishes the two via 'exists'.
  const created = await attemptSignUp(name, username, derived);
  if (created.ok) return created;
  if (created.code === 'exists') {
    // Account exists but sign-in just failed → it was the wrong PIN.
    return {
      ok: false,
      error: `Wrong PIN for “${name.trim()}”.`,
    };
  }
  // Real sign-up failure — surface it.
  return created;
}

export async function signOut(): Promise<void> {
  clearKeyCache();
  // Free this browser's push subscription while still authenticated, so the
  // next account to sign in here can claim the endpoint cleanly.
  try {
    await disablePush();
  } catch {
    // non-fatal
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // local session is cleared regardless
  }
  await destroyDb();
  window.location.href = '/';
}
