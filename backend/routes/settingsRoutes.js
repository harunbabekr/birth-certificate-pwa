import express from "express";
import PaymentSettings from "../models/PaymentSettings.js";

const router = express.Router();

async function getOrCreateSettings() {
  let settings = await PaymentSettings.findOne({ key: "registry_payment_settings" }).lean();
  if (!settings) {
    settings = await PaymentSettings.create({ key: "registry_payment_settings" });
  }
  return settings;
}

router.get("/payment-info", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    
    // تصفية الحسابات النشطة فقط لعرضها للمستخدم
    const activeAccounts = Array.isArray(settings.accounts)
      ? settings.accounts.filter((item) => item.isActive !== false)
      : [];

    return res.json({
      fixedAmount: Number(settings.fixedAmount || 5000),
      currency: settings.currency || "SDG",
      instructions: settings.instructions || "يرجى تحويل الرسوم المطلوبة إلى أحد الحسابات المعتمدة التالية ثم رفع إشعار التحويل لتأكيد الطلب.",
      accounts: activeAccounts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل تحميل بيانات الدفع البنكي" });
  }
});

export default router;