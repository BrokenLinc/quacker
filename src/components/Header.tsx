import * as UI from '@@ui';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { addGroup, useGroups } from '@@api';
import { UserAvatar } from '@@components/UserAvatar';
import {
  normalizePhoneInput,
  requestSmsOtp,
  resolveAppUserPhotoURL,
  signOut,
  useAuthState,
  verifySmsOtp,
} from '@@lib/supabase/auth';
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
  const [phoneInput, setPhoneInput] = React.useState('');
  const [normalizedPhone, setNormalizedPhone] = React.useState<string | null>(
    null
  );
  const [verificationSid, setVerificationSid] = React.useState<string | null>(
    null
  );
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sendInFlight = React.useRef(false);

  const sendCode = async (phone: string) => {
    if (sendInFlight.current || loading) return false;
    sendInFlight.current = true;
    setLoading(true);
    setError(null);
    const { error: sendError, verificationSid: sid } = await requestSmsOtp(phone);
    sendInFlight.current = false;
    setLoading(false);
    if (sendError) {
      setError(sendError.message);
      return false;
    }
    setNormalizedPhone(phone);
    setVerificationSid(sid);
    setCode('');
    setStep('code');
    return true;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhoneInput(phoneInput);
    if (!phone) {
      setError('Enter a valid US phone number');
      return;
    }
    await sendCode(phone);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedPhone || !verificationSid || loading) return;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifySmsOtp(
      normalizedPhone,
      code.trim(),
      verificationSid
    );
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    }
  };

  if (step === 'code') {
    return (
      <UI.HStack as="form" onSubmit={handleCodeSubmit} spacing={2}>
        <UI.Input
          size="sm"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          w="100px"
          data-testid="sign-in-code"
        />
        <UI.Button type="submit" variant="outline" size="sm" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify'}
        </UI.Button>
        <UI.Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => normalizedPhone && sendCode(normalizedPhone)}
        >
          Resend
        </UI.Button>
        <UI.Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setStep('phone');
            setCode('');
            setVerificationSid(null);
            setError(null);
          }}
        >
          Change
        </UI.Button>
        {error && (
          <UI.Text fontSize="xs" color="red.500">
            {error}
          </UI.Text>
        )}
        {!error && (
          <UI.Text fontSize="xs" color="gray.500">
            Use the code from your latest text
          </UI.Text>
        )}
      </UI.HStack>
    );
  }

  return (
    <UI.HStack as="form" onSubmit={handlePhoneSubmit} spacing={2}>
      <UI.Input
        size="sm"
        type="tel"
        placeholder="(555) 555-5555"
        value={phoneInput}
        onChange={(e) => setPhoneInput(e.target.value)}
        required
        w="140px"
        data-testid="sign-in-phone"
      />
      <UI.Button type="submit" variant="outline" size="sm" disabled={loading}>
        {loading ? 'Sending…' : 'Text me a code'}
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
        <UI.Box as="span" display="inline-flex" data-testid="user-menu-button">
          <UI.MenuButton
            as={UserAvatar}
            name={user.displayName || user.phone || user.email || ''}
            email={user.email}
            photoURL={user.photoURL}
            cursor="pointer"
            size="sm"
          />
        </UI.Box>
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
            Log out {user.displayName ?? user.phone ?? user.email}
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
  const [groups, loading, error] = useGroups({
    limit: 100,
    channelId: 'header-menu',
  });

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
        authorPhotoURL: await resolveAppUserPhotoURL(user),
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
