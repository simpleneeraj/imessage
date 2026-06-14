'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { IoAlertCircle, IoArrowForward, IoLockClosed } from 'react-icons/io5';
import { authenticate, slugifyUsername } from '@/lib/auth';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { OTPField, OTPFieldInput } from '@/components/ui/otp-field';
import { Alert, AlertDescription } from '@/components/ui/alert';

// One unified flow: enter your name + a 4-digit PIN. If the account exists we
// sign you in; if not we create it. Your name is your identity, and the PIN
// also derives your end-to-end encryption keys.
export function AuthGate({ onReady }: { onReady: (profile: Profile) => void }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handle = slugifyUsername(name);
  const nameValid = Boolean(handle);
  const canSubmit = nameValid && pin.length === 4 && !submitting;

  async function submit() {
    if (!nameValid) {
      setServerError('Please enter a name with at least 2 letters or numbers.');
      return;
    }
    if (pin.length !== 4) return;
    setServerError('');
    setSubmitting(true);
    const result = await authenticate(name, pin);
    if (!result.ok) {
      setServerError(result.error);
      setPin('');
      setSubmitting(false);
      return;
    }
    onReady(result.profile);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8"
      >
        {/* Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-[22px] bg-linear-to-b from-[#67e860] to-[#0fcc23] shadow-lg shadow-[#0fcc23]/30">
            <svg viewBox="0 0 24 24" className="size-9 fill-white">
              <path d="M12 3C6.48 3 2 6.92 2 11.75c0 2.75 1.46 5.2 3.73 6.8-.13 1.13-.6 2.25-1.45 3.15-.18.19-.04.5.22.47 1.99-.25 3.6-1.02 4.73-1.84.88.21 1.81.32 2.77.32 5.52 0 10-3.92 10-8.75S17.52 3 12 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
            Enter your name and a 4-digit PIN — we&apos;ll sign you in, or set
            you up if you&apos;re new.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-5"
        >
          <Field invalid={Boolean(serverError && !nameValid)}>
            <FieldLabel>Your name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Duncan Knox"
              autoComplete="name"
              autoCapitalize="words"
              autoFocus
              enterKeyHint="next"
            />
            {handle && (
              <FieldDescription>You&apos;ll be @{handle}</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel>PIN</FieldLabel>
            <OTPField
              size="lg"
              length={4}
              value={pin}
              onValueChange={setPin}
              onValueComplete={() => void submit()}
              mask
              aria-label="4-digit PIN"
              className="justify-center gap-3"
            >
              <OTPFieldInput
                aria-label="PIN digit 1 of 4"
                className="size-14 rounded-xl text-2xl sm:size-14 sm:text-2xl"
                inputMode="numeric"
              />
              <OTPFieldInput
                aria-label="PIN digit 2 of 4"
                className="size-14 rounded-xl text-2xl sm:size-14 sm:text-2xl"
                inputMode="numeric"
              />
              <OTPFieldInput
                aria-label="PIN digit 3 of 4"
                className="size-14 rounded-xl text-2xl sm:size-14 sm:text-2xl"
                inputMode="numeric"
              />
              <OTPFieldInput
                aria-label="PIN digit 4 of 4"
                className="size-14 rounded-xl text-2xl sm:size-14 sm:text-2xl"
                inputMode="numeric"
              />
            </OTPField>
          </Field>

          {serverError && (
            <motion.div
              key={serverError}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', x: [0, -8, 8, -5, 5, 0] }}
              transition={{ x: { duration: 0.4 } }}
            >
              <Alert variant="error" className="items-center">
                <IoAlertCircle />
                <AlertDescription className="text-destructive-foreground">
                  {serverError}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <Button
            type="submit"
            loading={submitting}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            Continue
            <IoArrowForward />
          </Button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <IoLockClosed className="size-3 shrink-0" />
          End-to-end encrypted. There&apos;s no PIN reset.
        </p>
      </motion.div>
    </div>
  );
}
