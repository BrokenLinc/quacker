import {
  corsHeaders,
  jsonResponse,
  normalizePhone,
  twilioAuthHeader,
  verifyServiceSid,
} from '../_shared/auth-utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { phone: rawPhone } = await req.json();
    const phone = normalizePhone(String(rawPhone ?? ''));
    if (!phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }

    const serviceSid = verifyServiceSid();
    const body = new URLSearchParams({ To: phone, Channel: 'sms' });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    const payload = await res.json();
    if (!res.ok) {
      console.error('Twilio send error', payload);
      return jsonResponse(
        { error: payload.message ?? 'Failed to send code' },
        res.status
      );
    }

    return jsonResponse({ ok: true, status: payload.status });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
