import * as UI from '@chakra-ui/react';
import React from 'react';

const DEFAULT_LENGTH = 6;

export type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  isDisabled?: boolean;
  length?: number;
  'data-testid'?: string;
};

const normalizeDigits = (raw: string, length: number) =>
  raw.replace(/\D/g, '').slice(0, length);

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  value,
  onChange,
  onComplete,
  isDisabled = false,
  length = DEFAULT_LENGTH,
  'data-testid': dataTestId,
}) => {
  const fieldRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const applyValue = (next: string) => {
    const digits = normalizeDigits(next, length);
    onChange(digits);
    if (digits.length === length) {
      onComplete?.(digits);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = normalizeDigits(e.clipboardData.getData('text'), length);
    if (!pasted) return;
    applyValue(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    fieldRefs.current[focusIndex]?.focus();
  };

  const handleKeyDown =
    (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      const currentDigit = value[index] ?? '';

      if (e.key === 'Backspace' && !currentDigit && index > 0) {
        e.preventDefault();
        const next = value.slice(0, index - 1) + value.slice(index);
        onChange(next);
        fieldRefs.current[index - 1]?.focus();
        return;
      }

      if (e.key === 'Delete') {
        if (currentDigit) {
          e.preventDefault();
          const next = value.slice(0, index) + value.slice(index + 1);
          onChange(next);
        }
      }
    };

  return (
    <UI.HStack justify="center" data-testid={dataTestId} onPaste={handlePaste}>
      <UI.PinInput
        otp
        value={value}
        onChange={applyValue}
        onComplete={onComplete}
        isDisabled={isDisabled}
        autoFocus
        size="md"
        manageFocus
        placeholder=""
      >
        {Array.from({ length }, (_, index) => (
          <UI.PinInputField
            key={index}
            ref={(el) => {
              fieldRefs.current[index] = el;
            }}
            type="tel"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            onKeyDown={handleKeyDown(index)}
          />
        ))}
      </UI.PinInput>
    </UI.HStack>
  );
};
