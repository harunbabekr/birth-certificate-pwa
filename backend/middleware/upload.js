import fs from "fs";
import multer from "multer";
import path from "path";

export const uploadDir = path.join(process.cwd(), "uploads");

// ضمان وجود مجلد الرفع عند الإقلاع
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".pdf", "application/pdf"],
]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeFieldName = String(file.fieldname || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeFieldName}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = String(file.mimetype || "").toLowerCase();

  const expectedMime = allowedMimeTypes.get(extension);

  if (expectedMime && (mimeType === expectedMime || (extension === ".jpg" && mimeType === "image/jpeg"))) {
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مدعوم. الصيغ المسموحة هي: PDF, PNG, JPG فقط"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 ميجابايت كحد أقصى لكل ملف
    files: 5,
  },
});

// Middleware وسيط لمعالجة أخطاء Multer وإرجاع رسالة مفهومة
export const handleUploadError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "حجم الملف يتجاوز الحد المسموح به (5 ميجابايت)" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "تم تجاوز عدد الملفات المسموح برفعها معاً" });
    }
    return res.status(400).json({ message: `خطأ في رفع الملفات: ${err.message}` });
  }

  if (err) {
    return res.status(400).json({ message: err.message });
  }

  next();
};

export default upload;