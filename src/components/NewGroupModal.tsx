import * as UI from '@@ui';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { addGroup } from '@@api';
import {
  phoneLast4FromPhone,
  resolveAppUserPhotoURL,
  useAuthState,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';

export const NewGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <UI.QuickModal isOpen={isOpen} onClose={onClose} headerContent="New room">
      <UI.ModalBody pb={6}>
        <NewGroupForm onCreated={onClose} />
      </UI.ModalBody>
    </UI.QuickModal>
  );
};

/** "New room" button with its own modal — drop in anywhere. */
export const NewGroupButton: React.FC<UI.ButtonProps> = (props) => {
  const modal = UI.useDisclosure();

  return (
    <React.Fragment>
      <UI.Button
        preset="primary"
        size="sm"
        iconBefore={faPlus}
        onClick={modal.onOpen}
        {...props}
      >
        New room
      </UI.Button>
      <NewGroupModal isOpen={modal.isOpen} onClose={modal.onClose} />
    </React.Fragment>
  );
};

/** Header/sidebar plus control — same modal as NewGroupButton. */
export const NewGroupIconButton: React.FC<
  Omit<UI.IconButtonProps, 'icon' | 'aria-label'>
> = (props) => {
  const modal = UI.useDisclosure();

  return (
    <React.Fragment>
      <UI.IconButton
        aria-label="New room"
        icon={faPlus}
        size="sm"
        variant="ghost"
        onClick={modal.onOpen}
        {...props}
      />
      <NewGroupModal isOpen={modal.isOpen} onClose={modal.onClose} />
    </React.Fragment>
  );
};

const NewGroupForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [user] = useAuthState();
  const [name, setName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const toast = UI.useToast();
  const navigate = useNavigate();

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { id } = await addGroup({
        uid: user.uid,
        authorName: user.displayName,
        authorPhotoURL: resolveAppUserPhotoURL(user),
        name: name.trim(),
        phoneLast4: phoneLast4FromPhone(user.phone),
      });
      onCreated();
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

  return (
    <UI.VStack as="form" onSubmit={handleSubmit} align="stretch" spacing={3}>
      <UI.FormControl>
        <UI.FormLabel>Room name</UI.FormLabel>
        <UI.Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Den"
          autoFocus
        />
      </UI.FormControl>
      <UI.Button
        type="submit"
        preset="primary"
        isDisabled={!name.trim()}
        isLoading={submitting}
        loadingText="Creating…"
      >
        Create room
      </UI.Button>
    </UI.VStack>
  );
};
