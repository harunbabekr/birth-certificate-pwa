import twilio from "twilio";

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    return null;
  }

  return { accountSid, authToken, verifyServiceSid };
}

function getTwilioClient(config) {
  return twilio(config.accountSid, config.authToken);
}

export async function sendSmsOtp({ to }) {
  if (!to || typeof to !== "string") {
    throw new Error("رقم الهاتف مطلوب لإرسال رمز التحقق");
  }

  const config = getTwilioConfig();

  // محاكاة الإرسال في بيئة التطوير إن لم تكن الخدمة مهيأة
  if (!config) {
    console.warn("\n⚠️ [SMS Service - Dev Mode]: Twilio is not configured.");
    console.log(`📱 Simulated SMS OTP sent to: ${to}`);
    console.log(`🔑 Accepted Dev Code: 123456\n`);
    return { status: "pending", simulated: true };
  }

  try {
    const client = getTwilioClient(config);
    return await client.verify.v2
      .services(config.verifyServiceSid)
      .verifications.create({
        to: to.trim(),
        channel: "sms",
      });
  } catch (error) {
    throw new Error(error?.message || "فشل إرسال رمز التحقق عبر الرسائل القصيرة");
  }
}

export async function checkSmsOtp({ to, code }) {
  if (!to || typeof to !== "string") {
    throw new Error("رقم الهاتف مطلوب للتحقق من الرمز");
  }

  if (!code || typeof code !== "string") {
    throw new Error("رمز التحقق مطلوب");
  }

  const config = getTwilioConfig();

  // التحقق التجريبي في حال عدم توفر Twilio
  if (!config) {
    if (code.trim() === "123456") {
      return { status: "approved", simulated: true };
    }
    return { status: "denied", simulated: true };
  }

  try {
    const client = getTwilioClient(config);
    return await client.verify.v2
      .services(config.verifyServiceSid)
      .verificationChecks.create({
        to: to.trim(),
        code: code.trim(),
      });
  } catch (error) {
    throw new Error(error?.message || "فشل التحقق من رمز الهاتف");
  }
}