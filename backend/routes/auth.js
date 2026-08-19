import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OtpCode from "../models/OtpCode.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { getDefaultPermissions } from "../constants/permissions.js";
import {
  detectIdentifierType,
  generateOtpCode,
  hashOtp,
  isSudanesePhone,
  normalizeEmail,
  normalizeIdentifier,
  normalizePhone,
} from "../utils/otp.js";
import { sendEmailOtp } from "../utils/sendEmail.js";
import { sendSmsOtp, checkSmsOtp } from "../utils/sendSms.js";

const router = express.Router();

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    isActive: Boolean(user.isActive),
    isEmailVerified: Boolean(user.isEmailVerified),
    isPhoneVerified: Boolean(user.isPhoneVerified),
    lastLoginAt: user.lastLoginAt || null,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function ensureStrongEnoughPassword(password = "") {
  const value = String(password || "").trim();
  if (value.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }
}

async function createAndSendOtp({ identifier, purpose, channel }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (channel === "email") {
    const code = generateOtpCode();

    await OtpCode.deleteMany({
      identifier: normalizedIdentifier,
      purpose,
      consumedAt: null,
    });

    await OtpCode.create({
      identifier: normalizedIdentifier,
      purpose,
      channel,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      consumedAt: null,
      attempts: 0,
    });

    await sendEmailOtp({
      to: normalizedIdentifier,
      code,
      purpose,
    });

    return;
  }

  await sendSmsOtp({ to: normalizedIdentifier });
}

async function verifyOtp({ identifier, purpose, code, channel }) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (channel === "phone") {
    const result = await checkSmsOtp({
      to: normalizedIdentifier,
      code,
    });

    if (!result || result.status !== "approved") {
      throw new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
    }

    return;
  }

  const otp = await OtpCode.findOne({
    identifier: normalizedIdentifier,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new Error("لم يتم العثور على رمز تحقق صالح");
  }

  if (!otp.expiresAt || otp.expiresAt.getTime() < Date.now()) {
    throw new Error("انتهت صلاحية رمز التحقق");
  }

  const MAX_OTP_ATTEMPTS = 5;
  if (Number(otp.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    throw new Error("تجاوزت الحد المسموح من المحاولات. يرجى طلب رمز جديد");
  }

  if (otp.codeHash !== hashOtp(code)) {
    otp.attempts = Number(otp.attempts || 0) + 1;
    await otp.save();
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
    throw new Error(
      remaining > 0
        ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
        : "تجاوزت الحد المسموح من المحاولات. يرجى طلب رمز جديد"
    );
  }

  otp.consumedAt = new Date();
  await otp.save();
}

router.get("/bootstrap-status", async (_req, res) => {
  try {
    const adminExists = Boolean(await User.exists({ role: { $in: ["admin", "superadmin"] } }));
    return res.json({ adminExists });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "تعذر التحقق من حالة المدير الأول",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "").trim();

    const email = normalizeEmail(req.body.email);
    const rawPhone = String(req.body.phone || "").trim();
    const phone = normalizePhone(rawPhone);

    if (!name || !password) {
      return res.status(400).json({ message: "الاسم وكلمة المرور مطلوبان" });
    }

    ensureStrongEnoughPassword(password);

    const channel = email ? "email" : phone ? "phone" : "";
    if (!channel) {
      return res.status(400).json({ message: "أدخل بريدًا إلكترونيًا أو رقم هاتف" });
    }

    if (channel === "phone" && !isSudanesePhone(phone)) {
      return res.status(400).json({
        message:
          "أدخل رقم هاتف سوداني صحيح. الصيغ المقبولة: 09XXXXXXXX أو 01XXXXXXXX أو +2499XXXXXXXX",
      });
    }

    const identifier = channel === "email" ? email : phone;

    const existing = await User.findOne(
      channel === "email" ? { email: identifier } : { phone: identifier }
    );

    if (existing && (existing.isEmailVerified || existing.isPhoneVerified)) {
      return res.status(400).json({ message: "هذا الحساب مسجل ومفعل بالفعل" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user =
      existing ||
      new User({
        name,
        email: channel === "email" ? identifier : undefined,
        phone: channel === "phone" ? identifier : undefined,
        password: hashedPassword,
        role: "user",
        permissions: [],
        isActive: true,
        authProvider: channel,
      });

    user.name = name;
    user.password = hashedPassword;
    if (channel === "email") user.email = identifier;
    if (channel === "phone") user.phone = identifier;
    if (channel === "email") user.isEmailVerified = false;
    if (channel === "phone") user.isPhoneVerified = false;
    user.authProvider = channel;

    await user.save();
    await createAndSendOtp({ identifier, purpose: "register", channel });

    return res.status(201).json({
      message:
        channel === "email"
          ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني"
          : "تم إرسال رمز التحقق إلى هاتفك",
      identifier,
      channel,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "فشل إنشاء الحساب",
    });
  }
});

router.post("/verify-register-otp", async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const code = String(req.body.code || "").trim();
    const type = detectIdentifierType(identifier);

    if (!identifier || !code || !type) {
      return res.status(400).json({ message: "البيانات غير مكتملة" });
    }

    await verifyOtp({
      identifier,
      purpose: "register",
      code,
      channel: type,
    });

    const user = await User.findOne(
      type === "email" ? { email: identifier } : { phone: identifier }
    );

    if (!user) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    if (type === "email") user.isEmailVerified = true;
    if (type === "phone") user.isPhoneVerified = true;
    await user.save();

    const token = signToken(user);

    return res.json({
      message: "تم تفعيل الحساب بنجاح",
      token,
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "فشل التحقق",
    });
  }
});

router.post("/resend-verification-otp", async (req, res) => {
  try {
    const rawIdentifier = String(req.body.identifier || "").trim();
    const normalizedPhoneCandidate = normalizePhone(rawIdentifier);
    const identifier = normalizeIdentifier(rawIdentifier);

    let channel = detectIdentifierType(identifier);

    if (!channel && isSudanesePhone(normalizedPhoneCandidate)) {
      channel = "phone";
    }

    if (!channel) {
      return res.status(400).json({ message: "المعرف غير صالح" });
    }

    const lookupIdentifier = channel === "phone" ? normalizedPhoneCandidate : identifier;

    const user = await User.findOne(
      channel === "email" ? { email: lookupIdentifier } : { phone: lookupIdentifier }
    );

    if (!user) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    if (
      (channel === "email" && user.isEmailVerified) ||
      (channel === "phone" && user.isPhoneVerified)
    ) {
      return res.status(400).json({ message: "الحساب موثق ومفعل بالفعل" });
    }

    await createAndSendOtp({
      identifier: lookupIdentifier,
      purpose: "register",
      channel,
    });

    return res.json({ message: "تمت إعادة إرسال رمز التحقق" });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "تعذر إعادة الإرسال",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const rawIdentifier = String(req.body.identifier || req.body.email || "").trim();
    const normalizedPhoneCandidate = normalizePhone(rawIdentifier);
    const identifier = normalizeIdentifier(rawIdentifier);

    let type = detectIdentifierType(identifier);

    if (!type && isSudanesePhone(normalizedPhoneCandidate)) {
      type = "phone";
    }

    if (!type || !req.body.password) {
      return res.status(400).json({
        message: "أدخل البريد أو الهاتف وكلمة المرور",
      });
    }

    const lookupIdentifier = type === "phone" ? normalizedPhoneCandidate : identifier;
    const password = String(req.body.password || "");

    // تم إضافة select("+password") لاسترجاع كلمة المرور المشفرة
    const user = await User.findOne(
      type === "email" ? { email: lookupIdentifier } : { phone: lookupIdentifier }
    ).select("+password");

    if (!user) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "تم تعطيل الحساب من قبل الإدارة" });
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return res.status(423).json({
        message: "الحساب مقفل مؤقتًا بسبب تكرار المحاولات الخاطئة",
      });
    }

    const isPrivileged = user.role === "admin" || user.role === "staff" || user.role === "superadmin";

    if (!isPrivileged) {
      if (type === "email" && !user.isEmailVerified) {
        return res.status(403).json({
          message: "الحساب غير مفعل. يرجى التحقق من البريد الإلكتروني أولاً",
        });
      }

      if (type === "phone" && !user.isPhoneVerified) {
        return res.status(403).json({
          message: "الحساب غير مفعل. يرجى التحقق من رقم الهاتف أولاً",
        });
      }
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await user.save();
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);

    return res.json({
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "فشل تسجيل الدخول",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const rawIdentifier = String(req.body.identifier || "").trim();
    const normalizedPhoneCandidate = normalizePhone(rawIdentifier);
    const identifier = normalizeIdentifier(rawIdentifier);

    let channel = detectIdentifierType(identifier);

    if (!channel && isSudanesePhone(normalizedPhoneCandidate)) {
      channel = "phone";
    }

    if (!channel) {
      return res.status(400).json({ message: "أدخل بريدًا أو رقم هاتف صحيحًا" });
    }

    const lookupIdentifier = channel === "phone" ? normalizedPhoneCandidate : identifier;

    const user = await User.findOne(
      channel === "email" ? { email: lookupIdentifier } : { phone: lookupIdentifier }
    );

    if (!user) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const finalIdentifier = channel === "email" ? user.email : user.phone;

    await createAndSendOtp({
      identifier: finalIdentifier,
      purpose: "reset_password",
      channel,
    });

    return res.json({
      message: "تم إرسال رمز إعادة التعيين",
      identifier: finalIdentifier,
      channel,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "فشل إرسال رمز إعادة التعيين",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const rawIdentifier = String(req.body.identifier || "").trim();
    const normalizedPhoneCandidate = normalizePhone(rawIdentifier);
    const identifier = normalizeIdentifier(rawIdentifier);

    let type = detectIdentifierType(identifier);

    if (!type && isSudanesePhone(normalizedPhoneCandidate)) {
      type = "phone";
    }

    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!code || !newPassword || !type) {
      return res.status(400).json({ message: "البيانات غير مكتملة" });
    }

    ensureStrongEnoughPassword(newPassword);

    const lookupIdentifier = type === "phone" ? normalizedPhoneCandidate : identifier;

    const user = await User.findOne(
      type === "email" ? { email: lookupIdentifier } : { phone: lookupIdentifier }
    );

    if (!user) {
      return res.status(404).json({ message: "الحساب غير موجود" });
    }

    const finalIdentifier = type === "email" ? user.email : user.phone;

    await verifyOtp({
      identifier: finalIdentifier,
      purpose: "reset_password",
      code,
      channel: type,
    });

    user.password = await bcrypt.hash(newPassword, 10);
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();

    return res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "فشل إعادة تعيين كلمة المرور",
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    return res.json({ user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "فشل تحميل بيانات المستخدم",
    });
  }
});

router.post("/create-first-admin", async (req, res) => {
  try {
    const setupKey = String(req.body.setupKey || "").trim();

    if (!setupKey || setupKey !== String(process.env.ADMIN_SETUP_KEY || "").trim()) {
      return res.status(403).json({ message: "مفتاح إعداد المدير غير صحيح" });
    }

    const exists = await User.findOne({ role: { $in: ["admin", "superadmin"] } });

    if (exists) {
      return res.status(400).json({ message: "يوجد مدير مسجل بالفعل في النظام" });
    }

    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "الاسم والبريد وكلمة المرور مطلوبة",
      });
    }

    ensureStrongEnoughPassword(password);

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "admin",
      permissions: getDefaultPermissions("admin"),
      isActive: true,
      isEmailVerified: true,
      authProvider: "email",
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "تم إنشاء أول مدير بنجاح",
      token,
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "فشل إنشاء المدير",
    });
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ message: "تم تسجيل الخروج بنجاح" });
});

export default router;