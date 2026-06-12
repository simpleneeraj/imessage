// Premium feature flags. Every paid feature checks hasFeature() so the
// DodoPayments checkout only has to flip entitlements later — for now
// everything is unlocked (beta).

export type Feature =
  | 'vibes'
  | 'gradient_bubbles'
  | 'premium_themes'
  | 'passcode'
  | 'view_once';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- flag consumed once DodoPayments entitlements land
export function hasFeature(_feature: Feature): boolean {
  return true;
}
