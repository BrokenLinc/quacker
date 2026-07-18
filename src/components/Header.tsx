import * as UI from '@@ui';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { addGroup, useGroups } from '@@api';
import { signOut, signInWithMagicLink, useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import { faMessage } from '@fortawesome/free-solid-svg-icons';

export const Header: React.FC = () => {
  const [user, loading, error] = useAuthState();

  if (loading) return <UI.Spinner />;
  if (error) return null;

  return (
    <UI.Box>
      <UI.HStack px={4} py={2}>
        <UI.HStack
          mr="auto"
          alignItems="center"
          color="green.500"
          as={UI.RouteLink}
          route={routes.home()}
        >
          <UI.Icon icon={faMessage} />
          <UI.Text fontWeight="bold" fontSize="sm">
            quacker
          </UI.Text>
        </UI.HStack>
        <ColorModeToggle />
        {user ? <UserMenu /> : <SignInForm />}
      </UI.HStack>
      <UI.Divider />
    </UI.Box>
  );
};

const SignInForm: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signInWithMagicLink(email.trim());
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <UI.Text fontSize="sm" color="green.500">
        Check your email for a magic link
      </UI.Text>
    );
  }

  return (
    <UI.HStack as="form" onSubmit={handleSubmit} spacing={2}>
      <UI.Input
        size="sm"
        type="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        w="160px"
      />
      <UI.Button type="submit" variant="outline" size="sm" disabled={loading}>
        {loading ? 'Sending…' : 'Magic link'}
      </UI.Button>
      {error && (
        <UI.Text fontSize="xs" color="red.500">
          {error}
        </UI.Text>
      )}
    </UI.HStack>
  );
};

const ColorModeToggle = () => {
  const { colorMode, toggleColorMode } = UI.useColorMode();
  return (
    <UI.Button onClick={toggleColorMode} size="sm" variant="ghost">
      {colorMode === 'light' ? 'Dark' : 'Light'}
    </UI.Button>
  );
};

const UserMenu: React.FC = () => {
  const [user, loading, error] = useAuthState();
  const addGroupModal = UI.useDisclosure();

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user) return null;

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.MenuButton
          as={UI.Avatar}
          name={user.displayName || user.email || ''}
          src={user.photoURL || undefined}
          cursor="pointer"
          size="sm"
        />
        <UI.MenuList>
          <GroupMenuItemList />
          <UI.MenuItem
            fontSize="sm"
            fontWeight="bold"
            onClick={addGroupModal.onOpen}
          >
            New group
          </UI.MenuItem>
          <UI.MenuItem fontSize="sm" onClick={() => signOut()}>
            Log out {user.displayName?.split(' ')[0] ?? user.email}
          </UI.MenuItem>
        </UI.MenuList>
      </UI.Menu>
      <UI.QuickModal {...addGroupModal} headerContent="New group">
        <UI.ModalBody>
          <AddGroupForm onCreated={addGroupModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupMenuItemList: React.FC = () => {
  const isLight = UI.useColorModeValue(true, false);
  const [groups, loading, error] = useGroups({ limit: 100 });

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!groups?.length) return null;

  return (
    <React.Fragment>
      {groups.map((group) => (
        <UI.RouteMenuItem
          key={group.id}
          route={routes.group(group.id)}
          fontSize="sm"
          activeProps={{
            bg: isLight ? 'green.100' : 'green.700',
          }}
        >
          {group.name}
        </UI.RouteMenuItem>
      ))}
      <UI.MenuDivider />
    </React.Fragment>
  );
};

const AddGroupForm: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [user, loading, error] = useAuthState();
  const [name, setName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const navigate = useNavigate();

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { id } = await addGroup({
        uid: user.uid,
        authorName: user.displayName,
        authorPhotoURL: user.photoURL,
        name: name.trim(),
      });
      onCreated();
      navigate(routes.group(id).path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UI.VStack align="stretch" spacing={3}>
      <UI.FormControl>
        <UI.FormLabel>Group name</UI.FormLabel>
        <UI.Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="WWDC hallway chat"
        />
      </UI.FormControl>
      <UI.Button
        colorScheme="green"
        onClick={handleSubmit}
        isDisabled={!name.trim() || submitting}
      >
        Create group
      </UI.Button>
    </UI.VStack>
  );
};
