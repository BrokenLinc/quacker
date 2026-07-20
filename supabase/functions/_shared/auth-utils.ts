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
  `${phone.replace(/\D/g, '')}@phone.hork.us`;

export const displayNameFromPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
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
