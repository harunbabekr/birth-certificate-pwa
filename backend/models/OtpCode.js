import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true, trim: true, lowercase: true },
    purpose: {
      type: String,
      enum: ["register", "reset_password", "verify_phone", "verify_email"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "phone"],
      required: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // حذف تلقائي للسجلات المنتهية
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

otpCodeSchema.index({ identifier: 1, purpose: 1, createdAt: -1 });

export default mongoose.model("OtpCode", otpCodeSchema);