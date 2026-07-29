import * as UI from '@@ui';
import React from 'react';
import { createDefaultMaskGenerator } from 'react-hook-mask';

import {
  getCurrentAuthUser,
  hasChosenDisplayName,
  normalizePhoneInput,
  requestSmsOtp,
  verifySmsOtp,
} from '@@lib/supabase/auth';
import { DisplayNameForm } from '@@components/DisplayNameForm';

const phoneMask = createDefaultMaskGenerator('(999) 999-9999');

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
  const [step, setStep] = React.useState<'phone' | 'code' | 'name'>('phone');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sendInFlight = React.useRef(false);
  const verifyInFlight = React.useRef(false);

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

  const verifyCode = async (otp: string) => {
    if (!normalizedPhone || !verificationSid || verifyInFlight.current) return;
    verifyInFlight.current = true;
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifySmsOtp(
      normalizedPhone,
      otp.trim(),
      verificationSid
    );
    if (verifyError) {
      verifyInFlight.current = false;
      setLoading(false);
      setError(verifyError.message);
      return;
    }

    // First session: ask for a real name before dropping into chat.
    const authUser = await getCurrentAuthUser();
    verifyInFlight.current = false;
    setLoading(false);
    if (!hasChosenDisplayName(authUser)) {
      setStep('name');
      return;
    }
    onSuccess?.();
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    await verifyCode(code);
  };

  if (step === 'name') {
    return (
      <UI.Box w="full" maxW="320px">
        <DisplayNameForm allowSkip onDone={() => onSuccess?.()} />
      </UI.Box>
    );
  }

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
          <UI.HStack justify="center" data-testid="sign-in-code">
            <UI.PinInput
              otp
              type="number"
              value={code}
              onChange={setCode}
              onComplete={(value) => {
                void verifyCode(value);
              }}
              isDisabled={loading}
              autoFocus
              size="md"
              manageFocus
              placeholder=""
            >
              <UI.PinInputField autoComplete="one-time-code" />
              <UI.PinInputField />
              <UI.PinInputField />
              <UI.PinInputField />
              <UI.PinInputField />
              <UI.PinInputField />
            </UI.PinInput>
          </UI.HStack>
          <UI.FormHelperText textAlign="center">
            Use the code from your latest text
          </UI.FormHelperText>
        </UI.FormControl>
        {error && (
          <UI.Text fontSize="sm" color="red.500">
            {error}
          </UI.Text>
        )}
        <UI.Button
          type="submit"
          preset="primary"
          isLoading={loading}
          loadingText="Verifying…"
          isDisabled={code.length !== 6}
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
        <UI.MaskedInput
          type="tel"
          placeholder="(555) 555-5555"
          maskGenerator={phoneMask}
          value={phoneInput}
          onChange={(value) =>
            setPhoneInput(typeof value === 'string' ? value : value.target.value)
          }
          required
          data-testid="sign-in-phone"
        />
        <UI.FormHelperText>
          US numbers only — we'll text you a code
        </UI.FormHelperText>
      </UI.FormControl>
      {error && (
        <UI.Text fontSize="sm" color="red.500">
          {error}
        </UI.Text>
      )}
      <UI.Button
        type="submit"
        preset="primary"
        isLoading={loading}
        loadingText="Sending…"
      >
        Text me a code
      </UI.Button>
    </UI.VStack>
  );
};
