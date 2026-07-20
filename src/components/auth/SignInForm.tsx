import * as UI from '@@ui';
import React from 'react';

import {
  normalizePhoneInput,
  requestSmsOtp,
  verifySmsOtp,
} from '@@lib/supabase/auth';

export type SignInFormProps = {
  onSuccess?: () => void;
};

export const SignInForm: React.FC<SignInFormProps> = ({ onSuccess }) => {
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
    const { error: sendError, verificationSid: sid } =
      await requestSmsOtp(phone);
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
      return;
    }
    onSuccess?.();
  };

  if (step === 'code') {
    return (
      <UI.VStack
        as="form"
        onSubmit={handleCodeSubmit}
        align="stretch"
        spacing={4}
        w="full"
        maxW="320px"
      >
        <UI.FormControl>
          <UI.FormLabel>Verification code</UI.FormLabel>
          <UI.Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            required
            data-testid="sign-in-code"
          />
          <UI.FormHelperText>Use the code from your latest text</UI.FormHelperText>
        </UI.FormControl>
        {error && (
          <UI.Text fontSize="sm" color="red.500">
            {error}
          </UI.Text>
        )}
        <UI.Button
          type="submit"
          colorScheme="green"
          isLoading={loading}
          loadingText="Verifying…"
        >
          Verify
        </UI.Button>
        <UI.HStack spacing={2}>
          <UI.Button
            type="button"
            variant="ghost"
            size="sm"
            isDisabled={loading}
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
            Change number
          </UI.Button>
        </UI.HStack>
      </UI.VStack>
    );
  }

  return (
    <UI.VStack
      as="form"
      onSubmit={handlePhoneSubmit}
      align="stretch"
      spacing={4}
      w="full"
      maxW="320px"
    >
      <UI.FormControl>
        <UI.FormLabel>Phone number</UI.FormLabel>
        <UI.Input
          type="tel"
          placeholder="(555) 555-5555"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          required
          data-testid="sign-in-phone"
        />
        <UI.FormHelperText>US numbers only — we'll text you a code</UI.FormHelperText>
      </UI.FormControl>
      {error && (
        <UI.Text fontSize="sm" color="red.500">
          {error}
        </UI.Text>
      )}
      <UI.Button
        type="submit"
        colorScheme="green"
        isLoading={loading}
        loadingText="Sending…"
      >
        Text me a code
      </UI.Button>
    </UI.VStack>
  );
};
