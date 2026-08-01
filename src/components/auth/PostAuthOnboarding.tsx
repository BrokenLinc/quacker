import * as UI from '@@ui';
import React from 'react';
import { useMatch } from 'react-router-dom';

import { DisplayNameForm } from '@@components/DisplayNameForm';

import { FirstTimeCreateRoom } from './FirstTimeCreateRoom';

export type PostAuthOnboardingProps = {
  /** Invite-link path — skip create-room after name. */
  invite?: boolean;
  onComplete: () => void;
};

/**
 * Post-OTP FTUE: name (+ notifications) then optional create-room.
 * Mounted by RequireAuth so it survives the session flip that unmounts SignInForm.
 */
export const PostAuthOnboarding: React.FC<PostAuthOnboardingProps> = ({
  invite = false,
  onComplete,
}) => {
  const slugMatch = useMatch('/g/:slug');
  const groupMatch = useMatch('/:groupId');
  const isInvitePath = invite || Boolean(slugMatch || groupMatch);
  const [step, setStep] = React.useState<'name' | 'create-room'>('name');

  const finishAfterName = () => {
    if (isInvitePath) {
      onComplete();
      return;
    }
    setStep('create-room');
  };

  return (
    <UI.Flex
      flex={1}
      minH={0}
      overflowY="auto"
      overscrollBehavior="contain"
      w="full"
      align="center"
      justify="center"
      px={4}
      py={6}
      pt="calc(1.5rem + env(safe-area-inset-top, 0px))"
      pb="calc(1.5rem + env(safe-area-inset-bottom, 0px))"
      data-testid="post-auth-onboarding"
    >
      <UI.Box maxW="400px" w="full">
        <UI.VStack align="center" spacing={6}>
          {step === 'name' ? (
            <UI.Box w="full" maxW="320px">
              <DisplayNameForm
                showNotificationsOptIn
                onDone={finishAfterName}
              />
            </UI.Box>
          ) : (
            <FirstTimeCreateRoom onDone={onComplete} />
          )}
        </UI.VStack>
      </UI.Box>
    </UI.Flex>
  );
};
