export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

export const isVerificationSid = (value: string) =>
  /^VE[0-9a-fA-F]{32}$/.test(value);

/** Mask phone for logs — last 4 digits only. */
export const maskPhone = (phone: string | null | undefined) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
};

type AuthOtpLog = Record<string, unknown>;

/** Structured JSON log line for Supabase Edge Function log search. */
export const logAuthOtp = (
  event: string,
  fields: AuthOtpLog,
  level: 'info' | 'error' = 'info'
) => {
  const line = JSON.stringify({
    source: 'auth-otp',
    event,
    ts: new Date().toISOString(),
    ...fields,
  });
  if (level === 'error') console.error(line);
  else console.log(line);
};

export const summarizeTwilioPayload = (payload: Record<string, unknown>) => ({
  twilio_code: payload.code ?? null,
  twilio_status: payload.status ?? null,
  twilio_message: payload.message ?? null,
  twilio_more_info: payload.more_info ?? null,
});

/** Map known Twilio Verify errors to user-safe copy (admin detail stays in logs). */
export const twilioSendOtpUserError = (
  payload: Record<string, unknown>
): string => {
  const code = Number(payload.code);
  if (code === 21608) {
    return "We can't send a verification code to that number yet. Try again later.";
  }
  if (code === 60203 || code === 60202) {
    return 'Too many verification attempts for this number. Try again later.';
  }
  return String(payload.message ?? 'Failed to send code');
};

export const summarizeTwilioVerification = (
  payload: Record<string, unknown>
) => ({
  verification_sid: payload.sid ?? null,
  status: payload.status ?? null,
  valid: payload.valid ?? null,
  to: maskPhone(String(payload.to ?? '')),
  channel: payload.channel ?? null,
  ...summarizeTwilioPayload(payload),
});

/** Normalize US and E.164 phone input to E.164 (+1XXXXXXXXXX). */
export const normalizePhone = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^\+[1-9]\d{6,14}$/.test(trimmed.replace(/\s/g, ''))) {
    return trimmed.replace(/\s/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
};

export const syntheticEmail = (phone: string) =>
  `${phone.replace(/\D/g, '')}@phone.yowl.us`;

/** Digits only — GoTrue may store phone with or without a leading `+`. */
export const phoneDigits = (phone: string | null | undefined) =>
  (phone ?? '').replace(/\D/g, '');

export const phonesMatch = (
  a: string | null | undefined,
  b: string | null | undefined
) => {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length > 0 && da === db;
};

export const displayNameFromPhone = (phone: string) => {
  const digits = phoneDigits(phone);
  return `···${digits.slice(-4)}`;
};

export const twilioAuthHeader = () => {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) {
    throw new Error('Missing Twilio credentials');
  }
  return 'Basic ' + btoa(`${accountSid}:${authToken}`);
};

export const verifyServiceSid = () => {
  const sid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
  if (!sid) throw new Error('Missing TWILIO_VERIFY_SERVICE_SID');
  return sid;
};

/** Local/dev only — never set as a production Edge Function secret. */
export const testOtpEnabled = () =>
  Deno.env.get('AUTH_ALLOW_TEST_OTP') === 'true';

export const testOtpCode = () =>
  (Deno.env.get('AUTH_TEST_OTP_CODE') ?? '555555').trim();

/**
 * Fictional US numbers in the 555-01XX block (NANP reserved for fiction).
 * Phone must already be normalized to E.164 (+1XXXXXXXXXX).
 */
export const isTestPhone = (phone: string) =>
  /^\+1\d{3}555(01\d{2})$/.test(phone);

/**
 * Reserved for FTUE / onboarding checks. When test OTP is enabled, any
 * existing auth user for this phone is deleted before issuing a session so
 * every login is a fresh “needs display name” signup.
 * Display: (202) 555-0199 — do not use for shared Maestro login (0100).
 */
export const FTUE_RESET_TEST_PHONE = '+12025550199';

export const isFtueResetTestPhone = (phone: string) =>
  phone === FTUE_RESET_TEST_PHONE;

/** Synthetic Twilio-shaped verification sid for the client contract. */
export const syntheticVerificationSid = () =>
  `VE${crypto.randomUUID().replace(/-/g, '')}`;
