import * as UI from '@@ui';
import React from 'react';

import { SignInForm } from './SignInForm';

export type SignInScreenProps = {
  heading?: string;
};

export const SignInScreen: React.FC<SignInScreenProps> = ({
  heading = 'Sign in to Hork',
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
    >
      <UI.Box maxW="480px" w="full" data-testid="sign-in-screen">
        <UI.VStack align="stretch" spacing={6}>
          <UI.VStack align="stretch" spacing={1}>
            <UI.Heading size="md">{heading}</UI.Heading>
            <UI.Text fontSize="sm" color="text.muted">
              We'll text you a 6-digit code
            </UI.Text>
          </UI.VStack>
          <SignInForm />
        </UI.VStack>
      </UI.Box>
    </UI.Flex>
  );
};
