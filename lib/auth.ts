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
import type { Profile } from './types';
import { clientTenantSlug } from './tenant';

// Synthetic domain for username->email mapping. Must pass GoTrue's email
// validation; example.com is RFC-reserved so nothing is ever deliverable, and
// with "Confirm email" disabled nothing is ever sent. The tenant slug is folded
// in as a subdomain so the same username can exist in two different spaces.
const EMAIL_DOMAIN = 'example.com';
export const USERNAME_RE = /^[a-zA-Z0-9_]{2,24}$/;
export const MIN_PASSWORD_LENGTH = 8;

export type AuthResult =
  | { ok: true; profile: Profile }
  // `code: 'exists'`      = the account is already registered (→ try sign-in).
  // `code: 'auth-failed'` = wrong password or no such account (→ try sign-up).
  // No code on other failures = authenticated but couldn't finish (surface it).
  | { ok: false; error: string; code?: 'exists' | 'no-space' | 'auth-failed' };

const NO_SPACE_ERROR =
  'Open this app from your space, e.g. https://your-space.chat.cutecode.app';

// A person's display name IS their identity within a space: the username is
// slugify(name) with '_' separators so it matches USERNAME_RE. Returns null if
// the name has no usable letters/numbers (e.g. emoji-only).
export function slugifyUsername(name: string): string | null {
  const u = slugify(name ?? '', { lower: true, strict: true, replacement: '_' })
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
    .replace(/_+$/g, '');
  return USERNAME_RE.test(u) ? u : null;
}

function syntheticEmail(username: string, slug: string): string {
  return `${username.toLowerCase()}@${slug}.${EMAIL_DOMAIN}`;
}

// Tenant-qualified identity → the KDF (auth password + encryption key) is scoped
// per space, so the same username/password in two spaces stays fully distinct.
function tenantIdentity(slug: string, username: string): string {
  return `${slug}:${username.toLowerCase()}`;
}

async function resolveTenantId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function persistLocal(profile: Profile, privateKey: CryptoKey) {
  await idb.kvSet('profile', profile);
  await idb.kvSet('privateKey', privateKey);
}

type Derived = { authPassword: string; encKey: CryptoKey };

// Create a brand-new account in the space (member #1, or #2 with an invite).
async function attemptSignUp(
  name: string,
  username: string,
  slug: string,
  tenantId: string,
  { authPassword, encKey }: Derived,
  inviteToken?: string,
): Promise<AuthResult> {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: syntheticEmail(username, slug),
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

  // The 2nd member must redeem the invite (claims the single open slot) before
  // their profile row will pass the cap trigger.
  if (inviteToken) {
    const { error: redeemError } = await supabase.rpc('redeem_invite', {
      p_slug: slug,
      p_token: inviteToken,
    });
    if (redeemError) {
      return {
        ok: false,
        error: /full/i.test(redeemError.message)
          ? 'This space is full (2/2).'
          : 'This invite link is invalid or has already been used.',
      };
    }
  }

  const keyPair = await generateIdentityKeyPair();
  const publicKey = await exportPublicKey(keyPair.publicKey);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      tenant_id: tenantId,
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
          : /invite/i.test(profileError.message)
            ? 'An invite link is required to join this space.'
            : /full/i.test(profileError.message)
              ? 'This space is full (2/2).'
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
  slug: string,
  { authPassword, encKey }: Derived,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(username, slug),
    password: authPassword,
  });
  if (error || !data.user) {
    // Wrong password OR no such account — caller falls back to sign-up.
    return { ok: false, error: 'Wrong password.', code: 'auth-failed' };
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

// Single entry point: have an account → log in; don't → create one. The name
// is the identity (username = slugify(name)).
//
// We sign IN first, then fall back to sign-up. This is deliberate: signing in
// never touches the member cap, so a returning member always gets back in even
// when the space is full (2/2). Only a genuinely new account reaches sign-up
// (and thus redeem_invite / the cap trigger). Doing it the other way round let
// a returning member trip "space is full" whenever signUp failed to cleanly
// report an existing account (e.g. under email-enumeration protection).
export async function authenticate(
  name: string,
  password: string,
  inviteToken?: string,
): Promise<AuthResult> {
  const username = slugifyUsername(name);
  if (!username) {
    return {
      ok: false,
      error: 'Please enter a name with at least 2 letters or numbers.',
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const slug = clientTenantSlug();
  if (!slug) return { ok: false, error: NO_SPACE_ERROR, code: 'no-space' };
  const tenantId = await resolveTenantId(slug);
  if (!tenantId) {
    return { ok: false, error: 'This space doesn’t exist yet.', code: 'no-space' };
  }

  // PBKDF2 is expensive — derive once and reuse for whichever path we take.
  const derived = await deriveKeys(tenantIdentity(slug, username), password);

  // Returning member → straight in, no cap involved.
  const signedIn = await attemptSignIn(username, slug, derived);
  if (signedIn.ok) return signedIn;
  // Authenticated but couldn't finish (e.g. broken profile/keys) → surface it;
  // don't fall through to sign-up and mislabel it as a wrong password.
  if (signedIn.code !== 'auth-failed') return signedIn;

  // Auth failed: either the account doesn't exist yet (→ create it) or the
  // password is wrong. attemptSignUp distinguishes the two via 'exists'.
  const created = await attemptSignUp(
    name,
    username,
    slug,
    tenantId,
    derived,
    inviteToken,
  );
  if (created.ok) return created;
  if (created.code === 'exists') {
    // Account exists but sign-in just failed → it was the wrong password.
    return {
      ok: false,
      error: `Wrong password for “${name.trim()}” in this space.`,
    };
  }
  // Real sign-up failure (space full, invite required, …) — surface it.
  return created;
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
