'use client';

import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import {
  IoEyeOutline,
  IoEyeOffOutline,
  IoAlertCircle,
  IoLockClosed,
  IoArrowForward,
} from 'react-icons/io5';
import { authenticate, slugifyUsername } from '@/lib/auth';
import { clientTenantSlug, ROOT_HOST } from '@/lib/tenant';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '@/components/ui/input-group';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  password: z.string().min(8, 'At least 8 characters'),
});
type FormValues = { name: string; password: string };

// One unified flow: enter your name + a password. If the account exists we sign
// you in; if not we create it. Your name is your identity in the space.
export function AuthGate({
  onReady,
  inviteToken,
}: {
  onReady: (profile: Profile) => void;
  inviteToken?: string;
}) {
  const invited = Boolean(inviteToken);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nameValue, setNameValue] = useState('');
  // AuthGate only mounts client-side (after AuthProvider's bootstrap).
  const slug = clientTenantSlug();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '' },
  });

  // live preview of the derived @handle
  const handle = slugifyUsername(nameValue);

  async function onSubmit(values: FormValues) {
    setServerError('');
    const result = await authenticate(values.name, values.password, inviteToken);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    onReady(result.profile);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center overflow-y-auto bg-background px-4 py-8">
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

          <h1 className="text-2xl font-bold tracking-tight">
            {invited ? "You're invited" : 'Messages'}
          </h1>

          {slug && (
            <span className="mt-2 rounded-full bg-imsg-gray px-3 py-1 text-xs font-medium text-imsg-text-gray">
              {slug}.{ROOT_HOST}
            </span>
          )}

          <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
            Enter your name and a password — we&apos;ll sign you in, or set you
            up if you&apos;re new.
          </p>
        </div>

        {!slug && (
          <Alert variant="error" className="mb-5 items-center">
            <IoAlertCircle />
            <AlertDescription className="text-destructive-foreground">
              No space selected. Go to{' '}
              <a href={`https://${ROOT_HOST}`} className="font-medium underline">
                {ROOT_HOST}
              </a>{' '}
              to create one.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field invalid={Boolean(errors.name)}>
            <FieldLabel>Your name</FieldLabel>
            <Input
              placeholder="Duncan Knox"
              autoComplete="name"
              autoCapitalize="words"
              autoFocus
              enterKeyHint="next"
              {...register('name', {
                onChange: (e) => setNameValue(e.target.value),
              })}
            />
            {errors.name ? (
              <FieldError match>{errors.name.message}</FieldError>
            ) : (
              handle && (
                <FieldDescription>You&apos;ll be @{handle} here</FieldDescription>
              )
            )}
          </Field>

          <Field invalid={Boolean(errors.password)}>
            <FieldLabel>Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="At least 8 characters"
                enterKeyHint="go"
                {...register('password')}
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <IoEyeOffOutline className="size-5" />
                  ) : (
                    <IoEyeOutline className="size-5" />
                  )}
                </button>
              </InputGroupAddon>
            </InputGroup>
            {errors.password && (
              <FieldError match>{errors.password.message}</FieldError>
            )}
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
            loading={isSubmitting}
            disabled={!slug}
            size="lg"
            className="w-full"
          >
            {invited ? 'Join space' : 'Continue'}
            <IoArrowForward />
          </Button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <IoLockClosed className="size-3 shrink-0" />
          End-to-end encrypted. There&apos;s no password reset.
        </p>
      </motion.div>
    </div>
  );
}
