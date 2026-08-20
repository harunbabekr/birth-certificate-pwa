import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

dotenv.config();

// الاتصال بقاعدة البيانات
connectDB();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// قائمة النطاقات المسموح لها بالاتصال
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // السماح بالطلبات التي ليس لها origin (مثل تطبيقات الـ PWA المثبتة أو Postman أو طلبات السيرفر الداخلية)
      if (!origin) return callback(null, true);

      // السماح إذا كان الرابط في القائمة أو ينتهي بنطاق vercel.app أو في وضع التطوير
      const isVercelDomain = origin.endsWith(".vercel.app");
      const isAllowed = allowedOrigins.includes(origin) || isVercelDomain || !isProduction;

      if (isAllowed) {
        return callback(null, true);
      }

      // تمرير false بدلاً من رمي خطأ يوقف السيرفر
      return callback(null, false);
    },
    credentials: true,
  })
);

// معالجة الـ Body
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// فحص جاهزية الخادم
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// المسارات الأساسية
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);

// مسارات الاختبار في بيئة التطوير فقط
if (!isProduction) {
  try {
    const { default: testRoutes } = await import("./routes/testRoutes.js");
    app.use("/api/test", testRoutes);
  } catch {
    // تجاوز في حال عدم وجود الملف
  }
}

// مسار 404 لأي مسار غير معرف
app.use((req, res, next) => {
  res.status(404).json({ message: `المسار المطلوب غير موجود: ${req.originalUrl}` });
});

// معالج الأخطاء العام (Global Error Handler)
app.use((err, _req, res, _next) => {
  console.error("Unhandled Error:", err);

  if (err?.message?.includes("CORS")) {
    return res.status(403).json({ message: "مصدر الطلب غير مسموح به (CORS Error)" });
  }

  if (err?.name === "MulterError" || err?.message?.includes("File too large")) {
    return res.status(400).json({ message: "حجم الملف المرفوع يتجاوز الحد المسموح به" });
  }

  return res.status(err.status || 500).json({
    message: err.message || "حدث خطأ غير متوقع في الخادم",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});