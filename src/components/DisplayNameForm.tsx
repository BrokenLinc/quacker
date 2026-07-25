import * as UI from '@@ui';
import React from 'react';

import { updateMyMemberProfile } from '@@api';
import {
  resolveAppUserPhotoURL,
  updateDisplayName,
  useAuthState,
} from '@@lib/supabase/auth';

export type DisplayNameFormProps = {
  /** Called after saving (or skipping, when allowed). */
  onDone?: () => void;
  allowSkip?: boolean;
};

/** "What should people call you?" — real identity beats `···1234`. */
export const DisplayNameForm: React.FC<DisplayNameFormProps> = ({
  onDone,
  allowSkip,
}) => {
  const [user] = useAuthState();
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const toast = UI.useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      if (user) {
        // Best-effort roster sync; the rename itself already succeeded.
        await updateMyMemberProfile(user.uid, {
          displayName: trimmed,
          photoURL: resolveAppUserPhotoURL(user),
        }).catch(() => undefined);
      }
      onDone?.();
    } catch {
      toast({
        title: "Couldn't save your name",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <UI.VStack as="form" onSubmit={handleSubmit} align="stretch" spacing={3}>
      <UI.FormControl>
        <UI.FormLabel>What should people call you?</UI.FormLabel>
        <UI.Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          autoFocus
          data-testid="display-name-input"
        />
        <UI.FormHelperText>
          Shown with your messages in every group
        </UI.FormHelperText>
      </UI.FormControl>
      <UI.Button
        type="submit"
        preset="primary"
        isDisabled={!name.trim()}
        isLoading={saving}
        loadingText="Saving…"
      >
        Save name
      </UI.Button>
      {allowSkip ? (
        <UI.Button variant="ghost" size="sm" onClick={() => onDone?.()}>
          Skip for now
        </UI.Button>
      ) : null}
    </UI.VStack>
  );
};
