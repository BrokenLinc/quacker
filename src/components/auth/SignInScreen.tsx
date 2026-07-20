import * as UI from '@@ui';
import React from 'react';

import { SignInForm } from './SignInForm';

export type SignInScreenProps = {
  heading?: string;
};

export const SignInScreen: React.FC<SignInScreenProps> = ({
  heading = 'Sign in to Quacker',
}) => {
  return (
    <UI.Box maxW="480px" mx="auto" p={4} data-testid="sign-in-screen">
      <UI.VStack align="stretch" spacing={6}>
        <UI.VStack align="stretch" spacing={1}>
          <UI.Heading size="md">{heading}</UI.Heading>
          <UI.Text fontSize="sm" color="gray.500">
            We'll text you a 6-digit code
          </UI.Text>
        </UI.VStack>
        <SignInForm />
      </UI.VStack>
    </UI.Box>
  );
};
