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
import type { Profile } from './types';

// Synthetic domain for username->email mapping. Must pass GoTrue's email
// validation; example.com is RFC-reserved so nothing is ever deliverable,
// and with "Confirm email" disabled nothing is ever sent.
const EMAIL_DOMAIN = 'example.com';
export const USERNAME_RE = /^[a-zA-Z0-9_]{2,24}$/;
export const MIN_PASSWORD_LENGTH = 8;

export type AuthResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

function syntheticEmail(username: string): string {
  return `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
}

async function persistLocal(profile: Profile, privateKey: CryptoKey) {
  await idb.kvSet('profile', profile);
  await idb.kvSet('privateKey', privateKey);
}

export async function signUp(
  username: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: 'Username must be 2–24 letters, numbers or underscores.',
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const { authPassword, encKey } = await deriveKeys(username, password);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: syntheticEmail(username),
    password: authPassword,
  });
  if (signUpError) {
    return {
      ok: false,
      error: /already registered/i.test(signUpError.message)
        ? 'That username is already taken.'
        : signUpError.message,
    };
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
      username: username.toLowerCase(),
      display_name: displayName,
      public_key: publicKey,
    })
    .select()
    .single();
  if (profileError) {
    return {
      ok: false,
      error:
        profileError.code === '23505'
          ? 'That username is already taken.'
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

export async function signIn(
  username: string,
  password: string,
): Promise<AuthResult> {
  const { authPassword, encKey } = await deriveKeys(username, password);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(username),
    password: authPassword,
  });
  if (error || !data.user) {
    return { ok: false, error: 'Wrong username or password.' };
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
        error: 'Could not unlock your encryption keys with that password.',
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

export async function signOut(): Promise<void> {
  clearKeyCache();
  try {
    await supabase.auth.signOut();
  } catch {
    // local session is cleared regardless
  }
  await destroyDb();
  window.location.href = '/';
}
