'use client';

import { z } from 'zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { signIn, signUp } from '@/lib/auth';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';

type Mode = 'signin' | 'signup';

const signinSchema = z.object({
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signupSchema = signinSchema.extend({
  displayName: z.string().min(2, 'Please enter your name'),
});

type AuthFormValues = {
  displayName?: string;
  username: string;
  password: string;
};

export function AuthGate({ onReady }: { onReady: (profile: Profile) => void }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [serverError, setServerError] = useState('');

  const schema = useMemo(
    () => (mode === 'signin' ? signinSchema : signupSchema),
    [mode],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      displayName: '',
    },
  });

  async function onSubmit(values: AuthFormValues) {
    setServerError('');

    const result =
      mode === 'signup'
        ? await signUp(values.username, values.password, values.displayName)
        : await signIn(values.username, values.password);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    onReady(result.profile);
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
          y: 30,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-[32px] border bg-background/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 via-transparent to-transparent" />

          <div className="relative">
            {/* Header */}

            <div className="mb-8 flex flex-col items-center text-center">
              <motion.div
                initial={{
                  scale: 0.8,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: 0.15,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  scale: 1.05,
                }}
                className="mb-4 flex size-20 items-center justify-center rounded-[24px] bg-linear-to-b from-[#67e860] to-[#0fcc23] shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="size-11 fill-white">
                  <path d="M12 3C6.48 3 2 6.92 2 11.75c0 2.75 1.46 5.2 3.73 6.8-.13 1.13-.6 2.25-1.45 3.15-.18.19-.04.5.22.47 1.99-.25 3.6-1.02 4.73-1.84.88.21 1.81.32 2.77.32 5.52 0 10-3.92 10-8.75S17.52 3 12 3z" />
                </svg>
              </motion.div>

              <motion.h1
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.2,
                }}
                className="text-3xl font-bold tracking-tight"
              >
                Messages
              </motion.h1>

              <motion.p
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.25,
                }}
                className="mt-2 text-sm text-muted-foreground"
              >
                End-to-end encrypted. Your password unlocks your messages on any
                device.
              </motion.p>
            </div>

            {/* Tabs */}

            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as Mode);
                setServerError('');
                reset();
              }}
              className="mb-6"
            >
              <TabsList className="w-full">
                <TabsTab value="signin">Sign In</TabsTab>
                <TabsTab value="signup">Create Account</TabsTab>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{
                    opacity: 0,
                    x: mode === 'signin' ? -20 : 20,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: mode === 'signin' ? 20 : -20,
                  }}
                  transition={{
                    duration: 0.22,
                  }}
                  className="space-y-4"
                >
                  <AnimatePresence>
                    {mode === 'signup' && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          height: 0,
                        }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                        }}
                      >
                        <Field>
                          <FieldLabel>Name</FieldLabel>

                          <Input
                            placeholder="Duncan Knox"
                            autoComplete="name"
                            {...register('displayName')}
                          />

                          <FieldError>{errors.displayName?.message}</FieldError>
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field>
                    <FieldLabel>Username</FieldLabel>

                    <Input
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="username"
                      placeholder="duncan_knox"
                      {...register('username', {
                        setValueAs: (value) =>
                          value?.toLowerCase().replace(/\s/g, ''),
                      })}
                    />

                    <FieldError>{errors.username?.message}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel>Password</FieldLabel>

                    <Input
                      type="password"
                      autoComplete={
                        mode === 'signup' ? 'new-password' : 'current-password'
                      }
                      placeholder={
                        mode === 'signup' ? 'At least 8 characters' : 'Password'
                      }
                      {...register('password')}
                    />

                    <FieldError>{errors.password?.message}</FieldError>
                  </Field>

                  {mode === 'signup' && (
                    <motion.p
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      className="text-xs leading-5 text-muted-foreground"
                    >
                      There is no password reset — your password is the only way
                      to unlock encrypted messages.
                    </motion.p>
                  )}
                </motion.div>
              </AnimatePresence>

              <motion.div
                animate={
                  serverError
                    ? {
                        x: [0, -8, 8, -6, 6, 0],
                      }
                    : {}
                }
              >
                <AnimatePresence>
                  {serverError && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                    >
                      <FieldError>{serverError}</FieldError>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <Button type="submit" disabled={isSubmitting}>
                <AnimatePresence mode="wait">
                  {isSubmitting ? (
                    <motion.span
                      key="loading"
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      className="flex items-center gap-2"
                    >
                      <Spinner className="size-4" />
                      Securing your messages...
                    </motion.span>
                  ) : (
                    <motion.span
                      key={mode}
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                    >
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
