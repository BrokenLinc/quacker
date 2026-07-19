import * as UI from '@@ui';
import React from 'react';

import {
  requestEmailOtp,
  verifyEmailOtp,
} from '@@lib/supabase/auth';
import { faMessage } from '@fortawesome/free-solid-svg-icons';

export const SignInScreen: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'otp'>('email');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: otpError } = await requestEmailOtp(email.trim());
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setStep('otp');
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    const { error: otpError } = await requestEmailOtp(email.trim());
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifyEmailOtp(email.trim(), code.trim());
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  return (
    <UI.Box
      minH="100dvh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      data-testid="sign-in-screen"
    >
      <UI.Box maxW="400px" w="full">
        <UI.VStack spacing={6} mb={8}>
          <UI.HStack color="green.500" spacing={2}>
            <UI.Icon icon={faMessage} boxSize={6} />
            <UI.Text fontWeight="bold" fontSize="xl">
              quacker
            </UI.Text>
          </UI.HStack>
          <UI.Text fontSize="sm" color="gray.500" textAlign="center">
            Ad-hoc group chat for trips and conferences
          </UI.Text>
        </UI.VStack>

        {step === 'email' ? (
          <UI.VStack
            as="form"
            onSubmit={handleSendCode}
            spacing={4}
            align="stretch"
          >
            <UI.FormControl isRequired>
              <UI.FormLabel>Email</UI.FormLabel>
              <UI.Input
                data-testid="sign-in-email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </UI.FormControl>
            <UI.Button
              type="submit"
              colorScheme="green"
              isLoading={loading}
              loadingText="Sending…"
              data-testid="sign-in-send-code"
            >
              Send code
            </UI.Button>
          </UI.VStack>
        ) : (
          <UI.VStack
            as="form"
            onSubmit={handleVerify}
            spacing={4}
            align="stretch"
          >
            <UI.Text fontSize="sm" color="green.500" textAlign="center">
              Check your email for a 6-digit code
            </UI.Text>
            <UI.Text fontSize="xs" color="gray.500" textAlign="center">
              Sent to {email}
            </UI.Text>
            <UI.FormControl isRequired>
              <UI.FormLabel>Verification code</UI.FormLabel>
              <UI.Input
                data-testid="sign-in-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
              />
            </UI.FormControl>
            <UI.Button
              type="submit"
              colorScheme="green"
              isLoading={loading}
              loadingText="Verifying…"
              isDisabled={code.length !== 6}
              data-testid="sign-in-verify"
            >
              Verify
            </UI.Button>
            <UI.HStack justify="center" spacing={4}>
              <UI.Button
                variant="link"
                size="sm"
                onClick={handleChangeEmail}
                type="button"
              >
                Change email
              </UI.Button>
              <UI.Button
                variant="link"
                size="sm"
                onClick={() => void handleResendCode()}
                type="button"
                isDisabled={loading}
              >
                Resend code
              </UI.Button>
            </UI.HStack>
          </UI.VStack>
        )}

        {error && (
          <UI.Text mt={4} fontSize="sm" color="red.500" textAlign="center">
            {error}
          </UI.Text>
        )}
      </UI.Box>
    </UI.Box>
  );
};
