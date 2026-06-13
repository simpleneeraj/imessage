'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OTPField, OTPFieldInput } from '@/components/ui/otp-field';
import { hashPasscode } from '@/lib/passcode';
import { supabase } from '@/lib/supabase';

// Set / update / remove the 4-digit passcode gate for a chat (own account only).
export function PasscodeDialog({
  open,
  onOpenChange,
  conversationId,
  hasPasscode,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  hasPasscode: boolean;
  onChanged: (hash: string | null) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    setCode('');
    onOpenChange(false);
  }

  async function save() {
    if (code.length !== 4 || busy) return;
    setBusy(true);
    const hash = await hashPasscode(code, conversationId);
    await supabase
      .rpc('set_passcode', { conv: conversationId, hash })
      .then(() => {});
    setBusy(false);
    onChanged(hash);
    close();
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    await supabase
      .rpc('set_passcode', { conv: conversationId, hash: null })
      .then(() => {});
    setBusy(false);
    onChanged(null);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogPopup className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {hasPasscode ? 'Change Passcode' : 'Set Passcode'}
          </DialogTitle>
          <DialogDescription>
            Locks this chat behind a 4-digit code — only on your account.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex justify-center py-2">
          <OTPField
            length={4}
            value={code}
            onValueChange={setCode}
            size="lg"
            aria-label="4-digit passcode"
          >
            <OTPFieldInput />
            <OTPFieldInput />
            <OTPFieldInput />
            <OTPFieldInput />
          </OTPField>
        </DialogPanel>
        <DialogFooter>
          <div className="flex flex-col flex-1 gap-2">
            {hasPasscode && (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => void remove()}
                className="w-full"
              >
                Remove Passcode
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={close} className="flex-1">
                Cancel
              </Button>
              <Button
                disabled={code.length !== 4 || busy}
                onClick={() => void save()}
                className="flex-1"
              >
                {hasPasscode ? 'Update' : 'Set Passcode'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
