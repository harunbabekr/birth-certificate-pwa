// تعريف الصلاحيات كـ Enum ثابت لمنع الأخطاء الإملائية في كامل المشروع
export const PERMISSION_KEYS = Object.freeze({
  VIEW_REQUESTS: "view_requests",
  VERIFY_DOCUMENTS: "verify_documents",
  VERIFY_PAYMENTS: "verify_payments",
  APPROVE_REQUESTS: "approve_requests",
  MARK_READY: "mark_ready",
  MANAGE_STAFF: "manage_staff",
  MANAGE_USERS: "manage_users",
  MANAGE_SETTINGS: "manage_settings", // إضافة مرنة لإعدادات الدفع والسيرفر
});

export const PERMISSIONS = [
  { key: PERMISSION_KEYS.VIEW_REQUESTS, label: "عرض الطلبات" },
  { key: PERMISSION_KEYS.VERIFY_DOCUMENTS, label: "عرض والتحقق من المستندات" },
  { key: PERMISSION_KEYS.VERIFY_PAYMENTS, label: "التحقق من الدفع" },
  { key: PERMISSION_KEYS.APPROVE_REQUESTS, label: "اعتماد أو رفض الطلبات" },
  { key: PERMISSION_KEYS.MARK_READY, label: "جعل الطلب جاهزًا للاستلام" },
  { key: PERMISSION_KEYS.MANAGE_STAFF, label: "إدارة الموظفين" },
  { key: PERMISSION_KEYS.MANAGE_USERS, label: "إدارة المستخدمين" },
  { key: PERMISSION_KEYS.MANAGE_SETTINGS, label: "إدارة إعدادات النظام" },
];

export const AVAILABLE_PERMISSIONS = Object.freeze(
  PERMISSIONS.map((item) => item.key)
);

export const PERMISSION_LABELS = Object.freeze(
  Object.fromEntries(PERMISSIONS.map((item) => [item.key, item.label]))
);

// الصلاحيات الإدارية الحصرية التي لا تُمنح افتراضياً للموظف العادي
export const ADMIN_ONLY_PERMISSIONS = [
  PERMISSION_KEYS.MANAGE_STAFF,
  PERMISSION_KEYS.MANAGE_USERS,
  PERMISSION_KEYS.MANAGE_SETTINGS,
];

export const STAFF_PERMISSION_KEYS = Object.freeze(
  AVAILABLE_PERMISSIONS.filter((item) => !ADMIN_ONLY_PERMISSIONS.includes(item))
);

/**
 * تنقية وتوحيد مصفوفة الصلاحيات مع إزالة التكرارات
 */
export function normalizePermissions(input = [], { includeAdminOnly = false } = {}) {
  const allowed = includeAdminOnly ? AVAILABLE_PERMISSIONS : STAFF_PERMISSION_KEYS;
  const values = Array.isArray(input) ? input : [input];

  return [
    ...new Set(
      values
        .map((item) => String(item || "").trim())
        .filter((item) => allowed.includes(item))
    ),
  ];
}

/**
 * جلب الصلاحيات الافتراضية بحسب نوع الحساب
 */
export function getDefaultPermissions(role = "user") {
  switch (role) {
    case "admin":
    case "superadmin":
      return [...AVAILABLE_PERMISSIONS];
    case "staff":
      return [...STAFF_PERMISSION_KEYS];
    default:
      return [];
  }
}

/**
 * دالة مساعدة سريعة للتحقق من امتلاك صلاحية محددة
 */
export function hasPermission(userPermissions = [], requiredPermission) {
  if (!requiredPermission) return true;
  return userPermissions.includes(requiredPermission);
}

/**
 * التحقق من امتلاك واحدة على الأقل من الصلاحيات المطلوبة
 */
export function hasAnyPermission(userPermissions = [], requiredPermissions = []) {
  if (!requiredPermissions.length) return true;
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
}