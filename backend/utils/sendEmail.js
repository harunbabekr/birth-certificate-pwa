async function sendBrevoEmail({ to, subject, html, code }) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  const appName = process.env.APP_NAME || "السجل المدني — استخراج شهادات الميلاد";

  // في بيئة التطوير إن لم تكن الإعدادات متوفرة يتم إظهار الكود بالـ Console
  if (!apiKey || !from) {
    console.warn("\n⚠️ [Email Service - Dev Mode]: BREVO_API_KEY or MAIL_FROM is not set.");
    console.log(`✉️ Simulated Email to: ${to}`);
    console.log(`🔑 OTP Code: ${code}`);
    console.log(`📋 Subject: ${subject}\n`);
    return { success: true, simulated: true };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: appName,
        email: from,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.code || "فشل إرسال البريد الإلكتروني عبر خدمة Brevo");
  }

  return data;
}

export async function sendEmailOtp({ to, code, purpose }) {
  const appName = process.env.APP_NAME || "السجل المدني";

  const subject =
    purpose === "reset_password"
      ? `رمز إعادة تعيين كلمة المرور - ${appName}`
      : `رمز التحقق من الحساب - ${appName}`;

  const html = `
    <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl; text-align: right; padding: 24px; color: #111827; background-color: #f9fafb; border-radius: 8px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">${appName}</h2>
      <p style="font-size: 16px; line-height: 1.8;">رمز التحقق الخاص بك هو:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #e0e7ff; color: #1e40af; padding: 16px; border-radius: 8px; display: inline-block; margin: 10px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">صلاحية هذا الرمز هي 10 دقائق فقط. يرجى عدم مشاركته مع أي شخص.</p>
    </div>
  `;

  return sendBrevoEmail({ to, subject, html, code });
}