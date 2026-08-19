import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import PaymentSettings from "../models/PaymentSettings.js";
import authMiddleware, { allowRoles } from "../middleware/authMiddleware.js";
import { PERMISSIONS, normalizePermissions } from "../constants/permissions.js";
import { normalizeEmail, normalizePhone, isSudanesePhone } from "../utils/otp.js";
import desktopOnlyForPrivileged from "../middleware/desktopOnlyForPrivileged.js";

const router = express.Router();
router.use(authMiddleware, desktopOnlyForPrivileged, allowRoles("admin", "superadmin"));

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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    lockUntil: user.lockUntil,
  };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeAccountNumber(value = "") {
  return String(value || "").trim().replace(/\s+/g, "");
}

function validateBankAccount(account = {}) {
  const id = String(account.id || "").trim();
  const label = String(account.label || "").trim();
  const bankName = String(account.bankName || "").trim();
  const accountName = String(account.accountName || "").trim();
  const accountNumber = normalizeAccountNumber(account.accountNumber);
  const isActive = account.isActive !== false;

  if (!id || !label || !bankName || !accountName || !accountNumber) {
    throw new Error("جميع بيانات الحساب البنكي مطلوبة");
  }

  if (!/^\d{7,20}$/.test(accountNumber)) {
    throw new Error("رقم الحساب البنكي يجب أن يكون بين 7 و20 رقمًا");
  }

  return { id, label, bankName, accountName, accountNumber, isActive };
}

async function getOrCreatePaymentSettings() {
  let settings = await PaymentSettings.findOne({ key: "registry_payment_settings" });
  if (!settings) {
    settings = await PaymentSettings.create({ key: "registry_payment_settings" });
  }
  return settings;
}

async function ensureUniqueContact({ email, phone, excludeId = null }) {
  const filters = [];
  if (email) filters.push({ email });
  if (phone) filters.push({ phone });
  if (!filters.length) return;

  const query = { $or: filters };
  if (excludeId) query._id = { $ne: excludeId };

  const exists = await User.findOne(query).select("_id");
  if (exists) throw new Error("البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل");
}

router.get("/summary", async (_req, res) => {
  try {
    const [users, staff, admins, activeStaff, disabledUsers] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "staff" }),
      User.countDocuments({ role: { $in: ["admin", "superadmin"] } }),
      User.countDocuments({ role: "staff", isActive: true }),
      User.countDocuments({ role: "user", isActive: false }),
    ]);

    return res.json({ stats: { users, staff, admins, activeStaff, disabledUsers } });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل ملخص الإدارة" });
  }
});

router.get("/permissions", async (_req, res) => {
  return res.json({ permissions: PERMISSIONS });
});

router.get("/staff", async (_req, res) => {
  try {
    const staffUsers = await User.find({ role: "staff" }).sort({ createdAt: -1 });
    return res.json({ users: staffUsers.map(safeUser), permissions: PERMISSIONS });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل الموظفين" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const rawPhone = String(req.body.phone || "").trim();
    const phone = rawPhone ? normalizePhone(rawPhone) : "";
    const password = String(req.body.password || "").trim();
    const permissions = normalizePermissions(req.body.permissions);

    if (!name || !password) {
      return res.status(400).json({ message: "الاسم وكلمة المرور مطلوبان" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    if (!email && !phone) {
      return res.status(400).json({ message: "أدخل بريدًا أو هاتفًا للموظف" });
    }

    if (phone && !isSudanesePhone(phone)) {
      return res.status(400).json({
        message: "رقم الهاتف غير صحيح. الصيغ المقبولة: 09XXXXXXXX أو 01XXXXXXXX أو +2499XXXXXXXX",
      });
    }

    await ensureUniqueContact({ email, phone });

    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      password: await bcrypt.hash(password, 10),
      role: "staff",
      permissions,
      isActive: true,
      isEmailVerified: Boolean(email),
      isPhoneVerified: Boolean(phone),
      authProvider: email && phone ? "both" : email ? "email" : "phone",
    });

    return res.status(201).json({ message: "تمت إضافة الموظف بنجاح", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل إضافة الموظف" });
  }
});

router.put("/staff/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "معرف الموظف غير صالح" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "staff" });
    if (!user) return res.status(404).json({ message: "الموظف غير موجود" });

    const nextName = String(req.body.name || user.name).trim();
    const nextEmail = req.body.email === undefined ? user.email || "" : normalizeEmail(req.body.email);
    const rawPhone = req.body.phone === undefined ? user.phone || "" : String(req.body.phone || "").trim();
    const nextPhone = rawPhone ? normalizePhone(rawPhone) : "";

    if (!nextName) {
      return res.status(400).json({ message: "اسم الموظف مطلوب" });
    }

    if (!nextEmail && !nextPhone) {
      return res.status(400).json({ message: "يجب الاحتفاظ ببريد أو هاتف واحد على الأقل" });
    }

    if (nextPhone && !isSudanesePhone(nextPhone)) {
      return res.status(400).json({
        message: "رقم الهاتف غير صحيح. الصيغ المقبولة: 09XXXXXXXX أو 01XXXXXXXX أو +2499XXXXXXXX",
      });
    }

    await ensureUniqueContact({
      email: nextEmail,
      phone: nextPhone,
      excludeId: user._id,
    });

    user.name = nextName;
    user.email = nextEmail || undefined;
    user.phone = nextPhone || undefined;
    user.permissions =
      req.body.permissions === undefined
        ? user.permissions
        : normalizePermissions(req.body.permissions);

    if (typeof req.body.isActive === "boolean") user.isActive = req.body.isActive;
    if (typeof req.body.isEmailVerified === "boolean") user.isEmailVerified = req.body.isEmailVerified;
    if (typeof req.body.isPhoneVerified === "boolean") user.isPhoneVerified = req.body.isPhoneVerified;

    if (req.body.unlockAccount) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    const newPassword = String(req.body.password || "").trim();
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    user.authProvider = user.email && user.phone ? "both" : user.email ? "email" : "phone";

    await user.save();

    return res.json({
      message: req.body.unlockAccount ? "تم تحديث بيانات الموظف وفك قفل الحساب" : "تم تحديث بيانات الموظف",
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحديث الموظف" });
  }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "معرف الموظف غير صالح" });
    }

    const user = await User.findOneAndDelete({ _id: req.params.id, role: "staff" });
    if (!user) return res.status(404).json({ message: "الموظف غير موجود" });

    return res.json({ message: "تم حذف الموظف بنجاح" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل حذف الموظف" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = { role: "user" };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.json({ users: users.map(safeUser) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل المستخدمين" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "معرف المستخدم غير صالح" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "user" });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    return res.json({ user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل بيانات المستخدم" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "معرف المستخدم غير صالح" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "user" });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (typeof req.body.isActive === "boolean") user.isActive = req.body.isActive;
    if (typeof req.body.isEmailVerified === "boolean") user.isEmailVerified = req.body.isEmailVerified;
    if (typeof req.body.isPhoneVerified === "boolean") user.isPhoneVerified = req.body.isPhoneVerified;

    if (req.body.unlockAccount) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    const newPassword = String(req.body.password || "").trim();
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    return res.json({ message: "تم تحديث حساب المستخدم", user: safeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحديث المستخدم" });
  }
});

router.get("/payment-info", async (_req, res) => {
  try {
    const settings = await getOrCreatePaymentSettings();
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل إعدادات الدفع البنكي" });
  }
});

router.put("/payment-info", async (req, res) => {
  try {
    const instructions = String(req.body.instructions || "").trim();
    const fixedAmount = Number(req.body.fixedAmount);

    if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) {
      return res.status(400).json({ message: "يرجى إدخال مبلغ ثابت صحيح" });
    }

    const rawAccounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
    if (!rawAccounts.length) {
      return res.status(400).json({ message: "يجب إدخال بنك واحد على الأقل" });
    }

    const normalizedAccounts = rawAccounts.map((account) => validateBankAccount(account));
    const ids = normalizedAccounts.map((item) => item.id);
    const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);

    if (duplicates.length) {
      return res.status(400).json({ message: "لا يمكن تكرار معرف الحساب البنكي" });
    }

    const settings = await getOrCreatePaymentSettings();
    settings.instructions = instructions || settings.instructions;
    settings.fixedAmount = fixedAmount;
    settings.accounts = normalizedAccounts;

    await settings.save();

    return res.json({ message: "تم تحديث إعدادات الدفع البنكي بنجاح", settings });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحديث إعدادات الدفع البنكي" });
  }
});

export default router;