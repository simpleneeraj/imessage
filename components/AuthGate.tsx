'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { IoAlertCircle, IoArrowForward, IoLockClosed } from 'react-icons/io5';
import { authenticate, slugifyUsername } from '@/lib/auth';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import {
  OTPField,
  OTPFieldInput,
  OTPFieldSeparator,
} from '@/components/ui/otp-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IoLogoOctocat } from 'react-icons/io';
import { Card, CardHeader, CardPanel } from './ui/card';

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
      >
        <Card className="w-full max-w-sm">
          {/* Header */}
          <CardHeader className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-xl bg-accent">
              <IoLogoOctocat className="size-9" />
            </div>

            <h1 className="text-2xl font-bold font-heading tracking-tight">
              Let&apos;s Talk
            </h1>
            <p className="mt-3 text-sm leading-snug text-muted-foreground">
              Enter your name and a 4-digit PIN — we&apos;ll sign you in, or set
              you up if you&apos;re new.
            </p>
          </CardHeader>
          <CardPanel>
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
                  placeholder="Enter your name..."
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
                  length={4}
                  value={pin}
                  onValueChange={setPin}
                  onValueComplete={() => void submit()}
                  mask
                  aria-label="4-digit PIN"
                  className="justify-center gap-3 w-full"
                  size="lg"
                >
                  <OTPFieldInput
                    aria-label="PIN digit 1 of 4"
                    inputMode="numeric"
                  />
                  <OTPFieldInput
                    aria-label="PIN digit 2 of 4"
                    inputMode="numeric"
                  />
                  <OTPFieldSeparator />
                  <OTPFieldInput
                    aria-label="PIN digit 3 of 4"
                    inputMode="numeric"
                  />
                  <OTPFieldInput
                    aria-label="PIN digit 4 of 4"
                    inputMode="numeric"
                  />
                </OTPField>
              </Field>

              {serverError && (
                <motion.div
                  key={serverError}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: 1,
                    height: 'auto',
                    x: [0, -8, 8, -5, 5, 0],
                  }}
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
                size="lg"
                type="submit"
                loading={submitting}
                disabled={!canSubmit}
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
          </CardPanel>
        </Card>
      </motion.div>
    </div>
  );
}
