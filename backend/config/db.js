import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    // إعدادات اتصال محسنة لضمان استقرار الاتصال والتحكم بالمهلة
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // مهلة 5 ثوانٍ للاتصال بدلاً من التعليق
      maxPoolSize: 10,                // عدد الاتصالات المتزامنة في الـ Pool
    });

    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);

    // مراقبة أحداث الاتصال في حال انقطع الاتصال لاحقاً أثناء تشغيل السيرفر
    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB runtime connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting reconnection...");
    });

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // إنهاء العملية برمز خطأ لمنع تشغيل السيرفر بدون قاعدة بيانات
    process.exit(1);
  }
};

export default connectDB;