import * as UI from '@@ui';
import React from 'react';

import { SignInForm } from './SignInForm';

export type SignInScreenProps = {
  /** Invite-link landing — swaps tagline for join-focused heading. */
  invite?: boolean;
  heading?: string;
};

const ORGANIC_TAGLINE =
  'Start a chat room and share it with anyone, right now. Perfect for work trips and meetups.';

export const SignInScreen: React.FC<SignInScreenProps> = ({
  invite = false,
  heading = 'Sign in to join this room',
}) => {
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
    >
      <UI.Box maxW="400px" w="full" data-testid="sign-in-screen">
        <UI.VStack align="center" spacing={8} w="full">
          <UI.VStack align="center" spacing={5} w="full">
            <UI.Image
              src="/yowl-logo.svg"
              alt="Yowl"
              h={{ base: '48px', md: '56px' }}
              w="auto"
              data-testid="sign-in-logo"
            />
            {invite ? (
              <UI.Heading size="md" textAlign="center">
                {heading}
              </UI.Heading>
            ) : (
              <UI.Text
                fontSize="md"
                textAlign="center"
                color="text.muted"
                lineHeight="tall"
              >
                {ORGANIC_TAGLINE}
              </UI.Text>
            )}
          </UI.VStack>
          <SignInForm invite={invite} />
        </UI.VStack>
      </UI.Box>
    </UI.Flex>
  );
};
