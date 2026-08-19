import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "غير مصرح، يرجى تسجيل الدخول أولاً" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "رمز التحقق مفقود" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not configured on the server");
      return res.status(500).json({ message: "خطأ في تكوين خادم المصادقة" });
    }

    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id)
      .select("_id name email phone role permissions isActive isEmailVerified isPhoneVerified")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود أو تم حذفه" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة" });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: user.isActive,
      isEmailVerified: Boolean(user.isEmailVerified),
      isPhoneVerified: Boolean(user.isPhoneVerified),
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول", isExpired: true });
    }
    return res.status(401).json({ message: "رمز المصادقة غير صالح" });
  }
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "غير مصرح" });
  
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "ليس لديك صلاحية الوصول لهذا الإجراء" });
  }
  next();
};

// التحقق من امتلاك كافة الصلاحيات المحددة
export const requirePermission = (...requiredPermissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "غير مصرح" });
  if (req.user.role === "admin" || req.user.role === "superadmin") return next();

  const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const hasAll = requiredPermissions.every((perm) => permissions.includes(perm));

  if (!hasAll) {
    return res.status(403).json({ message: "ليست لديك الصلاحية الكافية لإتمام هذا الإجراء" });
  }
  next();
};

// التحقق من امتلاك صلاحية واحدة على الأقل
export const requireAnyPermission = (...requiredPermissions) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "غير مصرح" });
  if (req.user.role === "admin" || req.user.role === "superadmin") return next();

  const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const hasAny = requiredPermissions.some((perm) => permissions.includes(perm));

  if (!hasAny) {
    return res.status(403).json({ message: "ليست لديك أي من الصلاحيات المطلوبة" });
  }
  next();
};

export default authMiddleware;