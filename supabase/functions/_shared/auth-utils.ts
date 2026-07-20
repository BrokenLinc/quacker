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
