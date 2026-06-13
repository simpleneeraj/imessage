'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { IoAlertCircle, IoArrowForward, IoSparkles } from 'react-icons/io5';
import { supabase } from '@/lib/supabase';
import { SLUG_RE, ROOT_HOST, tenantUrl } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';

function cleanSlug(v: string): string {
  return (v ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

const schema = z.object({
  name: z.string().max(50).optional(),
  // slug is cleaned via setValueAs before this runs
  slug: z.string().refine((s) => SLUG_RE.test(s), {
    message: 'Use 2–32 letters, numbers or hyphens.',
  }),
});
type FormValues = { name?: string; slug: string };

// Root-domain onboarding: reserve a subdomain ("space"), then bounce to it so
// the first of (up to) two people can create their account there.
export function CreateSpace() {
  const [serverError, setServerError] = useState('');
  const [slugValue, setSlugValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', slug: '' },
  });

  // live address preview
  const preview = cleanSlug(slugValue);

  async function onSubmit(values: FormValues) {
    setServerError('');
    const slug = cleanSlug(values.slug);
    const { error: rpcError } = await supabase.rpc('reserve_tenant', {
      p_slug: slug,
      p_name: values.name?.trim() || null,
    });
    if (rpcError) {
      setServerError(
        /taken|unique/i.test(rpcError.message)
          ? 'That address is already taken — try another.'
          : /invalid/i.test(rpcError.message)
            ? 'That address isn’t allowed.'
            : rpcError.message,
      );
      return;
    }
    // Cross-subdomain hop to the new space to onboard member #1.
    window.location.assign(tenantUrl(slug));
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
            <IoSparkles className="size-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your space</h1>
          <p className="mt-3 text-[15px] leading-snug text-muted-foreground">
            A private, end-to-end encrypted space for two — on its own address.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field invalid={Boolean(errors.name)}>
            <FieldLabel>
              Space name{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              placeholder="Alice & Bob"
              autoFocus
              enterKeyHint="next"
              {...register('name')}
            />
            {errors.name && <FieldError match>{errors.name.message}</FieldError>}
          </Field>

          <Field invalid={Boolean(errors.slug)}>
            <FieldLabel>Address</FieldLabel>
            <InputGroup>
              <InputGroupInput
                placeholder="alice-bob"
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="go"
                {...register('slug', {
                  setValueAs: cleanSlug,
                  onChange: (e) => setSlugValue(e.target.value),
                })}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText className="text-xs">
                  .{ROOT_HOST}
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {errors.slug ? (
              <FieldError match>{errors.slug.message}</FieldError>
            ) : (
              <FieldDescription>
                {preview ? `${preview}.${ROOT_HOST}` : `your-space.${ROOT_HOST}`}
              </FieldDescription>
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
            disabled={!isValid}
            size="lg"
            className="w-full"
          >
            Create space
            <IoArrowForward />
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Up to two people can join. You’ll set up your account on the new
          address.
        </p>
      </motion.div>
    </div>
  );
}
