import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const paymentSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "registry_payment_settings", unique: true, index: true },
    fixedAmount: { type: Number, default: 5000, min: 0 },
    currency: { type: String, default: "SDG", trim: true },
    instructions: {
      type: String,
      default: "يرجى تحويل الرسوم المطلوبة إلى أحد الحسابات المعتمدة التالية ثم رفع إشعار التحويل لتأكيد الطلب.",
    },
    accounts: {
      type: [bankAccountSchema],
      default: [
        {
          id: "omdurman",
          label: "بنك أم درمان الوطني",
          bankName: "Omdurman National Bank",
          accountName: "Civil Registry Services",
          accountNumber: "1234567",
          isActive: true,
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentSettings", paymentSettingsSchema);