import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true, index: true },
    phone: { type: String, unique: true, sparse: true, trim: true, index: true },
    password: { type: String, required: true, select: false }, // حماية تلقائية لكلمة المرور
    role: {
      type: String,
      enum: ["user", "staff", "admin", "superadmin"],
      default: "user",
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    authProvider: {
      type: String,
      enum: ["email", "phone", "both"],
      default: "email",
    },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// دالة فحص إغلاق الحساب المؤقت بسبب المحاولات الفاشلة
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model("User", userSchema);