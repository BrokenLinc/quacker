import * as UI from '@@ui';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { addGroup } from '@@api';
import {
  phoneLast4FromPhone,
  resolveAppUserPhotoURL,
  useAuthState,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';

export type FirstTimeCreateRoomProps = {
  onDone: () => void;
};

/** Organic FTUE step after name — skipped when signing in from an invite URL. */
export const FirstTimeCreateRoom: React.FC<FirstTimeCreateRoomProps> = ({
  onDone,
}) => {
  const [user] = useAuthState();
  const [name, setName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const toast = UI.useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { id } = await addGroup({
        uid: user.uid,
        authorName: user.displayName,
        authorPhotoURL: resolveAppUserPhotoURL(user),
        name: trimmed,
        phoneLast4: phoneLast4FromPhone(user.phone),
      });
      onDone();
      navigate(routes.group(id).path);
    } catch {
      toast({
        title: "Couldn't create the room",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!name.trim() && !submitting;

  return (
    <UI.VStack
      as="form"
      onSubmit={handleSubmit}
      align="stretch"
      spacing={4}
      w="full"
      maxW="320px"
      data-testid="ftue-create-room"
    >
      <UI.Heading size="md">Start a chat room</UI.Heading>
      <UI.FormControl>
        <UI.FormLabel>Room name</UI.FormLabel>
        <UI.Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Den"
          autoFocus
          autoComplete="off"
          data-testid="ftue-room-name"
        />
      </UI.FormControl>
      <UI.Text fontSize="sm" color="text.muted">
        Remember: Anyone with the link to your chat room will be able to join
        it.
      </UI.Text>
      <UI.Button
        type="submit"
        preset="primary"
        isDisabled={!canSubmit}
        isLoading={submitting}
        loadingText="Creating…"
      >
        Create room
      </UI.Button>
      <UI.Button
        type="button"
        variant="ghost"
        size="sm"
        isDisabled={submitting}
        onClick={onDone}
      >
        Skip
      </UI.Button>
    </UI.VStack>
  );
};
