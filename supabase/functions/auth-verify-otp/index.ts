import {
  corsHeaders,
  formatError,
  isTestPhone,
  isVerificationSid,
  jsonResponse,
  logAuthOtp,
  maskPhone,
  normalizePhone,
  summarizeTwilioVerification,
  testOtpCode,
  testOtpEnabled,
  twilioAuthHeader,
  verifyServiceSid,
} from '../_shared/auth-utils.ts';
import {
  createAdminClient,
  issuePhoneSession,
} from '../_shared/phone-session.ts';

const assertNotLockdownBlocked = async (phone: string) => {
  const admin = createAdminClient();
  const { data: lockdown, error } = await admin.rpc('get_site_lockdown');
  if (error) throw error;
  if (!lockdown) return;
  const { data: isAdmin, error: adminErr } = await admin.rpc(
    'is_superadmin_phone',
    { p_phone: phone }
  );
  if (adminErr) throw adminErr;
  if (!isAdmin) {
    throw Object.assign(new Error('Yowl is temporarily offline.'), {
      code: 'SITE_LOCKDOWN',
    });
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { phone: rawPhone, code, verification_sid: rawVerificationSid } =
      await req.json();
    const phone = normalizePhone(String(rawPhone ?? ''));
    const otp = String(code ?? '').trim();
    const verificationSid = String(rawVerificationSid ?? '').trim();
    const hasValidVerificationSid = isVerificationSid(verificationSid);

    if (!hasValidVerificationSid && !phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }
    if (!/^\d{4,10}$/.test(otp)) {
      return jsonResponse({ error: 'Invalid code' }, 400);
    }

    if (phone) {
      try {
        await assertNotLockdownBlocked(phone);
      } catch (e) {
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === 'SITE_LOCKDOWN'
        ) {
          return jsonResponse(
            {
              error: 'Yowl is temporarily offline. We\'re working on it!',
              code: 'SITE_LOCKDOWN',
            },
            503
          );
        }
        throw e;
      }
    }

    // Local/dev test OTP — never enable AUTH_ALLOW_TEST_OTP in prod secrets.
    if (
      testOtpEnabled() &&
      phone &&
      isTestPhone(phone) &&
      otp === testOtpCode()
    ) {
      logAuthOtp('verify_test', { phone: maskPhone(phone) });
      return issuePhoneSession(createAdminClient(), phone);
    }

    const serviceSid = verifyServiceSid();
    const checkBody = new URLSearchParams({ Code: otp });
    if (phone) {
      checkBody.set('To', phone);
    }
    if (hasValidVerificationSid) {
      checkBody.set('VerificationSid', verificationSid);
    }

    logAuthOtp('verify_request', {
      phone: maskPhone(phone),
      code_length: otp.length,
      verification_sid: hasValidVerificationSid ? verificationSid : null,
      verification_sid_valid: hasValidVerificationSid,
      check_includes_to: Boolean(phone),
      check_includes_verification_sid: hasValidVerificationSid,
      service_sid: serviceSid,
    });

    const checkRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: checkBody,
      }
    );

    const checkPayload = await checkRes.json();
    const twilioSummary = summarizeTwilioVerification(checkPayload);

    if (!checkRes.ok) {
      logAuthOtp(
        'verify_twilio_error',
        {
          http_status: checkRes.status,
          phone: maskPhone(phone),
          request_verification_sid: hasValidVerificationSid
            ? verificationSid
            : null,
          service_sid: serviceSid,
          ...twilioSummary,
        },
        'error'
      );
      const status =
        checkRes.status === 404 ? 401 : checkRes.status >= 500 ? 500 : 400;
      return jsonResponse(
        {
          error:
            checkRes.status === 404
              ? 'Code expired or too many attempts. Text yourself a new code.'
              : (checkPayload.message ?? 'Verification failed'),
        },
        status
      );
    }

    if (checkPayload.status !== 'approved') {
      logAuthOtp(
        'verify_not_approved',
        {
          http_status: checkRes.status,
          phone: maskPhone(String(checkPayload.to ?? phone)),
          request_verification_sid: hasValidVerificationSid
            ? verificationSid
            : null,
          response_verification_sid: checkPayload.sid ?? null,
          service_sid: serviceSid,
          ...twilioSummary,
        },
        'error'
      );
      return jsonResponse(
        {
          error:
            'Incorrect code. Use the latest text message or request a new code.',
        },
        401
      );
    }

    const verifiedPhone = normalizePhone(String(checkPayload.to ?? phone ?? ''));
    if (!verifiedPhone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }

    logAuthOtp('verify_ok', {
      phone: maskPhone(String(checkPayload.to ?? phone)),
      verification_sid: checkPayload.sid ?? verificationSid,
      service_sid: serviceSid,
      status: checkPayload.status,
      valid: checkPayload.valid ?? null,
    });

    return issuePhoneSession(createAdminClient(), verifiedPhone, {
      verification_sid: checkPayload.sid ?? verificationSid,
    });
  } catch (e) {
    logAuthOtp('verify_exception', { error: formatError(e) }, 'error');
    return jsonResponse({ error: formatError(e) }, 500);
  }
});
