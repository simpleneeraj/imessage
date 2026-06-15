'use client';

// Web Push subscription management. The push-only service worker lives at
// /sw.js (registered in AuthProvider). Enabling notifications requests
// permission, subscribes via the VAPID public key, and stores the subscription
// row so the `notify` edge function can reach this device.

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buf;
}

// Resolve to the active SW registration, registering it if AuthProvider hasn't
// yet. Using navigator.serviceWorker.ready (not getRegistration, which is null
// until activation) avoids the race where the toggle reads its state before the
// worker is live and wrongly reports "off".
async function activeRegistration(): Promise<ServiceWorkerRegistration> {
  if (!(await navigator.serviceWorker.getRegistration())) {
    await navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  return navigator.serviceWorker.ready;
}

/** Is this device currently subscribed (and permission granted)? */
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await activeRegistration();
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

export type EnableResult =
  | 'ok'
  | 'unsupported'
  | 'no-vapid'
  | 'denied'
  | 'error';

// Set by enablePush() on failure so the UI can surface the *specific* reason
// (the generic 'error' code alone made every distinct failure indistinguishable
// on a phone where there's no console to inspect).
export let lastPushError = '';

/** Request permission, subscribe, and persist the subscription. */
export async function enablePush(): Promise<EnableResult> {
  lastPushError = '';
  if (!isPushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'no-vapid';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const reg = await activeRegistration();

    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
      }));

    // Confirm there's a live Supabase session — save_push_subscription needs
    // auth.uid(); without it the RPC raises "auth required" and the row never
    // lands (the most common silent cause of "subscribed but no pushes").
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      lastPushError = 'Not signed in (no Supabase session). Sign in again, then enable.';
      return 'error';
    }

    const json = sub.toJSON();
    // Reassign this browser's endpoint to the current account (handles two
    // accounts sharing one browser, which RLS would otherwise block).
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh ?? '',
      p_auth: json.keys?.auth ?? '',
    });
    if (error) {
      lastPushError = `Save failed: ${error.message}`;
      return 'error';
    }
    return 'ok';
  } catch (err) {
    lastPushError = `Subscribe failed: ${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? String(err)}`.trim();
    return 'error';
  }
}

/** Unsubscribe this device and remove its stored subscription. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
