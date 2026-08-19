import { randomInt } from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import BirthRequest from "../models/BirthRequest.js";
import PaymentSettings from "../models/PaymentSettings.js";
import authMiddleware, { allowRoles, requirePermission } from "../middleware/authMiddleware.js";
import upload, { uploadDir } from "../middleware/upload.js";
import archiveRequestFiles from "../utils/archiveRequestFiles.js";

const router = express.Router();
const UPLOAD_ROOT = path.resolve(uploadDir);

const SAFE_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

function sendSecureFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = SAFE_MIME[ext] || "application/octet-stream";
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);
  res.setHeader("Content-Type", mime);
  return res.sendFile(filePath);
}

function generateRequestNumber() {
  const year = new Date().getFullYear();
  const random = randomInt(100000, 999999);
  return `BC-${year}-${random}`;
}

function generateRevisionRequestNumber() {
  const year = new Date().getFullYear();
  const random = randomInt(100000, 999999);
  return `RV-${year}-${random}`;
}

function normalizeRequestNumber(value = "") {
  return String(value).trim().toUpperCase();
}

function buildStatusFilter(statusParam) {
  if (!statusParam) return {};
  const statuses = String(statusParam).split(",").map((item) => item.trim()).filter(Boolean);
  if (!statuses.length) return {};
  if (statuses.length === 1) return { status: statuses[0] };
  return { status: { $in: statuses } };
}

function canAccessRequest(request, req) {
  const userId = req.user?.id || req.user?._id;
  if (["staff", "admin", "superadmin"].includes(req.user?.role)) return true;
  return String(request.user) === String(userId);
}

function appendStatusHistory(request, status, note, req) {
  request.statusHistory.push({
    status,
    note: note || "",
    changedByRole: req.user?.role || "system",
    changedByName: req.user?.name || "النظام",
    changedById: req.user?.id || null,
    changedAt: new Date(),
  });
}

function resolveUploadedPath(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(String(filePath));
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep) && resolved !== UPLOAD_ROOT) return null;
  return resolved;
}

const ALLOWED_STATUSES = new Set([
  "pending_payment",
  "pending",
  "waiting_verification",
  "approved",
  "ready",
  "rejected",
  "needs_revision",
  "payment_issue",
]);

const maybeUploadFiles = (req, res, next) => {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) return next();

  return upload.fields([
    { name: "fatherId", maxCount: 1 },
    { name: "motherId", maxCount: 1 },
    { name: "astatement", maxCount: 1 },
    { name: "marriageCert", maxCount: 1 },
  ])(req, res, next);
};

const deleteFileIfExists = (filePath) => {
  const normalized = resolveUploadedPath(filePath);
  if (!normalized) return;
  if (fs.existsSync(normalized)) {
    try {
      fs.unlinkSync(normalized);
    } catch (err) {
      console.error("Failed to delete file:", normalized, err.message);
    }
  }
};

const deleteRequestAttachments = (requestDoc) => {
  if (!requestDoc) return;
  deleteFileIfExists(requestDoc.fatherId);
  deleteFileIfExists(requestDoc.motherId);
  deleteFileIfExists(requestDoc.astatement);
  deleteFileIfExists(requestDoc.marriageCert);
  deleteFileIfExists(requestDoc.receipt);
  deleteFileIfExists(requestDoc.certificateImage);
};

async function getFixedAmount() {
  let settings = await PaymentSettings.findOne({ key: "registry_payment_settings" });
  if (!settings) settings = await PaymentSettings.create({ key: "registry_payment_settings" });
  return Number(settings.fixedAmount || 5000);
}

router.get("/track/:requestNumber", authMiddleware, async (req, res) => {
  try {
    const requestNumber = normalizeRequestNumber(req.params.requestNumber);
    if (!requestNumber) {
      return res.status(400).json({ message: "يرجى إدخال رقم الطلب" });
    }

    const filter = { requestNumber };
    const userId = req.user?.id || req.user?._id;
    if (req.user?.role === "user") filter.user = userId;

    const request = await BirthRequest.findOne(filter);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

    return res.json({
      ...request.toObject(),
      certificateImageAvailable: Boolean(request.certificateImage),
    });
  } catch {
    return res.status(500).json({ message: "فشل البحث عن الطلب" });
  }
});

router.get(
  "/",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("view_requests"),
  async (req, res) => {
    try {
      const { status, q } = req.query;
      const filter = buildStatusFilter(status);

      if (q && String(q).trim()) {
        const query = String(q).trim();
        filter.$or = [
          { requestNumber: { $regex: query, $options: "i" } },
          { childName: { $regex: query, $options: "i" } },
          { applicantName: { $regex: query, $options: "i" } },
          { applicantNationalId: { $regex: query, $options: "i" } },
          { revisionRequestNumber: { $regex: query, $options: "i" } },
        ];
      }

      const requests = await BirthRequest.find(filter).sort({ createdAt: -1 });
      return res.json(requests);
    } catch {
      return res.status(500).json({ message: "فشل تحميل الطلبات" });
    }
  }
);

router.post(
  "/:id/status",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("approve_requests"),
  async (req, res) => {
    try {
      const { status, rejectionReason, reviewNotes } = req.body || {};
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ message: "قيمة الحالة غير صحيحة" });
      }

      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (status === "approved" && !request.paymentVerified) {
        return res.status(400).json({ message: "لا يمكن اعتماد الطلب قبل التحقق من الدفع" });
      }

      if (status === "rejected" && !String(rejectionReason || "").trim()) {
        return res.status(400).json({ message: "يرجى كتابة سبب الرفض" });
      }

      request.status = status;
      request.rejectionReason = status === "rejected" ? String(rejectionReason).trim() : null;
      request.reviewNotes = String(reviewNotes || "").trim() || request.reviewNotes || null;
      request.reviewedBy = req.user?.id || null;

      appendStatusHistory(
        request,
        status,
        status === "rejected" ? `تم رفض الطلب: ${request.rejectionReason}` : request.reviewNotes || `تم تحديث الحالة إلى ${status}`,
        req
      );

      await request.save();
      return res.json(request);
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل تحديث الحالة" });
    }
  }
);

router.post(
  "/:id/confirm-cash-payment",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("verify_payments"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (request.paymentMethod !== "cash") {
        return res.status(400).json({ message: "هذا الطلب ليس دفعًا نقديًا" });
      }

      request.paid = true;
      request.paymentVerified = true;
      request.status = "approved";
      request.reviewedBy = req.user?.id || null;

      appendStatusHistory(request, "approved", "تم التحقق من الدفع النقدي واعتماد الطلب", req);
      archiveRequestFiles(request);

      await request.save();
      return res.json({ message: "تم تأكيد الدفع وقبول الطلب", request });
    } catch {
      return res.status(500).json({ message: "فشل تأكيد الدفع" });
    }
  }
);

router.post(
  "/:id/confirm-bank-transfer",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("verify_payments"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (request.paymentMethod !== "bank_transfer") {
        return res.status(400).json({ message: "هذا الطلب ليس تحويلًا بنكيًا" });
      }

      if (!request.receipt) {
        return res.status(400).json({ message: "لا يوجد إيصال مرفوع لهذا الطلب" });
      }

      const reviewNotes = String(req.body?.reviewNotes || "").trim() || "تم التحقق من الدفع البنكي واعتماد الطلب";

      request.paid = true;
      request.paymentVerified = true;
      request.status = "approved";
      request.paymentIssueReason = null;
      request.reviewNotes = reviewNotes;
      request.reviewedBy = req.user?.id || null;

      appendStatusHistory(request, "approved", reviewNotes, req);
      archiveRequestFiles(request);

      await request.save();
      return res.json({ message: "تم التحقق من الدفع البنكي وقبول الطلب", request });
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل تأكيد الدفع البنكي" });
    }
  }
);

router.post(
  "/:id/report-payment-issue-manual",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("verify_payments"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      const issueType = String(req.body.issueType || "").trim();
      const differenceAmount = Number(req.body.differenceAmount || 0);
      const reason = String(req.body.reason || "").trim();

      if (!["overpaid", "underpaid"].includes(issueType)) {
        return res.status(400).json({ message: "نوع المشكلة غير صحيح" });
      }

      if (!differenceAmount || differenceAmount <= 0) {
        return res.status(400).json({ message: "يرجى إدخال فرق المبلغ بشكل صحيح" });
      }

      if (!reason) {
        return res.status(400).json({ message: "يرجى كتابة سبب المشكلة" });
      }

      request.status = "payment_issue";
      request.paymentVerified = false;
      request.paid = false;
      request.paymentIssueType = issueType;
      request.paymentDifferenceAmount = differenceAmount;
      request.paymentIssueReason = reason;
      request.refundStatus = issueType === "overpaid" ? "pending_refund" : "not_required";
      request.reviewedBy = req.user?.id || null;

      appendStatusHistory(request, "payment_issue", `تم تسجيل مشكلة دفع: ${reason}`, req);

      await request.save();
      return res.json({ message: "تم تسجيل مشكلة الدفع", request });
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل تسجيل مشكلة الدفع" });
    }
  }
);

router.post("/:id/request-payment-resolution", authMiddleware, async (req, res) => {
  try {
    const request = await BirthRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    const note = String(req.body.note || "").trim();
    if (!note) return res.status(400).json({ message: "يرجى كتابة طلب المعالجة" });

    request.paymentResolutionRequested = true;
    request.paymentResolutionNote = note;
    request.paymentResolutionRequestedAt = new Date();
    request.paymentResolutionStatus = "requested";

    appendStatusHistory(request, "payment_issue", `طلب معالجة من مقدم الطلب: ${note}`, req);

    await request.save();
    return res.json({ message: "تم إرسال طلب معالجة مشكلة الدفع", request });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل إرسال طلب المعالجة" });
  }
});

router.post(
  "/:id/resolve-payment-issue",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("verify_payments"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      const action = String(req.body.action || "").trim();
      const note = String(req.body.note || "").trim();

      request.paymentResolutionHandledAt = new Date();
      request.paymentResolutionHandledBy = req.user?.name || "الموظف";

      if (action === "approve_with_refund_pending") {
        request.paymentVerified = true;
        request.paid = true;
        request.status = "approved";
        request.refundStatus = "pending_refund";
        request.paymentResolutionStatus = "approved";
        request.reviewNotes = note || "تم اعتماد الطلب مع بقاء فرق المبلغ قيد الاسترداد";
      } else if (action === "mark_refunded") {
        request.paymentVerified = true;
        request.paid = true;
        request.status = "approved";
        request.refundStatus = "refunded";
        request.paymentResolutionStatus = "resolved";
        request.reviewNotes = note || "تم استرداد فرق المبلغ واعتماد الطلب";
      } else if (action === "require_additional_payment") {
        request.paymentVerified = false;
        request.paid = false;
        request.status = "payment_issue";
        request.paymentResolutionStatus = "under_review";
        request.reviewNotes = note || "يجب على المستخدم إكمال فرق المبلغ";
      } else if (action === "reject") {
        if (!note) return res.status(400).json({ message: "يرجى كتابة سبب الرفض المالي" });
        request.status = "rejected";
        request.rejectionReason = note;
        request.paymentResolutionStatus = "resolved";
      } else {
        return res.status(400).json({ message: "إجراء المعالجة غير صحيح" });
      }

      appendStatusHistory(request, request.status, request.reviewNotes || request.rejectionReason, req);

      await request.save();
      return res.json({ message: "تمت معالجة مشكلة الدفع", request });
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل معالجة مشكلة الدفع" });
    }
  }
);

router.post(
  "/:id/mark-ready",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("mark_ready"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (request.status !== "approved") {
        return res.status(400).json({ message: "لا يمكن جعل الطلب جاهزًا إلا بعد اعتماده" });
      }

      if (!request.certificateImage || !request.certificateNumber || !request.issuedAt) {
        return res.status(400).json({
          message: "يجب رفع صورة الشهادة وإدخال رقم الشهادة وتاريخ الإصدار أولًا",
        });
      }

      request.status = "ready";
      appendStatusHistory(request, "ready", "تم جعل الطلب جاهزًا للاستلام", req);
      await request.save();

      return res.json({ message: "تم جعل الطلب جاهزًا للاستلام", request });
    } catch {
      return res.status(500).json({ message: "فشل تحديث الحالة إلى جاهز للاستلام" });
    }
  }
);

router.post(
  "/:id/certificate",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("mark_ready"),
  upload.single("certificateImage"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (request.status !== "approved") {
        return res.status(400).json({ message: "يمكن رفع صورة الشهادة فقط عندما يكون الطلب في حالة معتمد" });
      }

      if (!req.file?.path) {
        return res.status(400).json({ message: "يرجى اختيار صورة الشهادة أو ملف PDF" });
      }

      const certificateNumber = String(req.body.certificateNumber || "").trim();
      const issuedAt = req.body.issuedAt ? new Date(req.body.issuedAt) : null;

      if (!certificateNumber) return res.status(400).json({ message: "رقم الشهادة مطلوب" });
      if (!issuedAt || Number.isNaN(issuedAt.getTime())) {
        return res.status(400).json({ message: "تاريخ الإصدار مطلوب" });
      }

      deleteFileIfExists(request.certificateImage);
      request.certificateImage = req.file.path;
      request.certificateNumber = certificateNumber;
      request.issuedAt = issuedAt;

      appendStatusHistory(request, "approved", "تم رفع صورة الشهادة وإدخال بياناتها", req);

      await request.save();
      return res.json({ message: "تم رفع صورة الشهادة وحفظ بياناتها", request });
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل رفع صورة الشهادة" });
    }
  }
);

router.post("/:id/request-correction", authMiddleware, async (req, res) => {
  try {
    const request = await BirthRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    if (request.status !== "ready") {
      return res.status(400).json({ message: "لا يمكن طلب تعديل إلا بعد أن تصبح الشهادة جاهزة" });
    }

    const revisionField = String(req.body.revisionField || "").trim();
    const revisionReason = String(req.body.revisionReason || "").trim();

    if (!revisionField || !revisionReason) {
      return res.status(400).json({ message: "يرجى تحديد موضع الخطأ وكتابة الملاحظة" });
    }

    request.status = "needs_revision";
    request.revisionField = revisionField;
    request.revisionReason = revisionReason;
    request.revisionRequestNumber = generateRevisionRequestNumber();
    request.reviewNotes = `طلب تعديل من مقدم الطلب - الموضع: ${revisionField}`;

    appendStatusHistory(
      request,
      "needs_revision",
      `طلب تعديل: ${revisionField} - ${revisionReason}`,
      req
    );

    await request.save();
    return res.json({ message: "تمت إعادة إرسال الطلب للتعديل", request });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل إرسال طلب التعديل" });
  }
});

router.post(
  "/:id/revision-completed",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("mark_ready"),
  upload.single("certificateImage"),
  async (req, res) => {
    try {
      const request = await BirthRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      if (request.status !== "needs_revision") {
        return res.status(400).json({ message: "هذا الطلب ليس في حالة تعديل" });
      }

      if (!req.file?.path) {
        return res.status(400).json({ message: "يرجى رفع صورة الشهادة المصححة" });
      }

      deleteFileIfExists(request.certificateImage);
      request.certificateImage = req.file.path;
      request.certificateNumber = String(req.body.certificateNumber || "").trim() || request.certificateNumber;
      request.issuedAt = req.body.issuedAt ? new Date(req.body.issuedAt) : request.issuedAt || new Date();
      request.status = "ready";
      request.reviewNotes = String(req.body.reviewNotes || "").trim() || "تمت معالجة التعديل وإعادة إرسال الشهادة";
      request.revisionField = null;
      request.revisionReason = null;

      appendStatusHistory(request, "ready", request.reviewNotes, req);

      await request.save();
      return res.json({ message: "تمت إعادة إرسال الشهادة بعد التعديل", request });
    } catch (error) {
      return res.status(500).json({ message: error.message || "فشل إعادة إرسال الشهادة" });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("staff", "admin", "superadmin"),
  requirePermission("approve_requests"),
  async (req, res) => {
    try {
      const requestDoc = await BirthRequest.findById(req.params.id);
      if (!requestDoc) return res.status(404).json({ message: "الطلب غير موجود" });

      deleteRequestAttachments(requestDoc);
      await BirthRequest.findByIdAndDelete(req.params.id);

      return res.json({ message: "تم حذف الطلب بنجاح" });
    } catch {
      return res.status(500).json({ message: "حدث خطأ أثناء حذف الطلب" });
    }
  }
);

router.post("/:id/bank-transfer", authMiddleware, async (req, res) => {
  try {
    const request = await BirthRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    const { transferRef, transferNote, transferAccountId, transferAccountLabel, transferTxId } = req.body;

    if (!transferRef) return res.status(400).json({ message: "مرجع التحويل مطلوب" });
    if (!transferAccountId || !transferAccountLabel) {
      return res.status(400).json({ message: "يرجى اختيار حساب السجل المحول إليه" });
    }

    if (!/^\d{4}$/.test(String(transferTxId || "").trim())) {
      return res.status(400).json({ message: "يرجى إدخال آخر 4 أرقام من رقم العملية" });
    }

    const expectedAmount = await getFixedAmount();

    request.transferRef = String(transferRef).trim();
    request.paymentExpectedAmount = expectedAmount;
    request.transferNote = transferNote || null;
    request.transferAccountId = String(transferAccountId).trim();
    request.transferAccountLabel = String(transferAccountLabel).trim();
    request.transferTxId = String(transferTxId).trim();
    request.paid = false;
    request.paymentVerified = false;
    request.status = "pending";

    appendStatusHistory(request, "pending", "تم حفظ بيانات التحويل بانتظار رفع الإيصال", req);

    await request.save();
    return res.json({ message: "تم حفظ بيانات التحويل", request });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل حفظ بيانات التحويل" });
  }
});

router.post("/", authMiddleware, maybeUploadFiles, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const paymentMethod = req.body.paymentMethod || "cash";

    if (!req.body.childName || !req.body.birthDate || !req.body.gender) {
      return res.status(400).json({ message: "بيانات المولود الأساسية غير مكتملة" });
    }

    if (!req.body.applicantName || !req.body.applicantNationalId || !req.body.registryOffice || !req.body.deliveryMethod) {
      return res.status(400).json({ message: "يرجى استكمال بيانات مقدم الطلب والمكتب" });
    }

    const initialStatus = paymentMethod === "cash" || paymentMethod === "online" ? "pending_payment" : "pending";
    const expectedAmount = await getFixedAmount();

    let request = null;
    for (let i = 0; i < 5; i += 1) {
      try {
        request = await BirthRequest.create({
          requestNumber: generateRequestNumber(),
          childName: req.body.childName,
          birthDate: req.body.birthDate,
          gender: req.body.gender,
          birthPlace: req.body.birthPlace || null,
          applicantName: req.body.applicantName,
          applicantNationalId: req.body.applicantNationalId,
          applicantRelation: req.body.applicantRelation || null,
          fatherName: req.body.fatherName || null,
          motherName: req.body.motherName || null,
          registryOffice: req.body.registryOffice,
          deliveryMethod: req.body.deliveryMethod,
          paymentMethod,
          paymentChannel: req.body.paymentChannel || null,
          paymentExpectedAmount: expectedAmount,
          paid: false,
          paymentVerified: false,
          fatherId: req.files?.fatherId?.[0]?.path || null,
          motherId: req.files?.motherId?.[0]?.path || null,
          astatement: req.files?.astatement?.[0]?.path || null,
          marriageCert: req.files?.marriageCert?.[0]?.path || null,
          user: userId,
          status: initialStatus,
          statusHistory: [
            {
              status: initialStatus,
              note: "تم إنشاء الطلب بنجاح",
              changedByRole: req.user?.role || "user",
              changedByName: req.user?.name || "مستخدم",
              changedById: userId,
              changedAt: new Date(),
            },
          ],
        });
        break;
      } catch (error) {
        if (error?.code === 11000) continue;
        throw error;
      }
    }

    if (!request) return res.status(500).json({ message: "فشل توليد رقم طلب فريد" });

    return res.status(201).json({ message: "تم إنشاء الطلب بنجاح", requestNumber: request.requestNumber, request });
  } catch (error) {
    return res.status(500).json({ message: error.message || "فشل إنشاء الطلب" });
  }
});

router.post("/:id/receipt", authMiddleware, upload.single("receipt"), async (req, res) => {
  try {
    const request = await BirthRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    if (!req.file?.path) return res.status(400).json({ message: "لم يتم استلام ملف الإيصال" });

    deleteFileIfExists(request.receipt);
    request.receipt = req.file.path;
    request.status = "waiting_verification";

    appendStatusHistory(request, "waiting_verification", "تم رفع إيصال التحويل البنكي بانتظار المراجعة", req);

    await request.save();
    return res.json({ message: "تم رفع الإيصال بنجاح", request });
  } catch {
    return res.status(500).json({ message: "فشل رفع الإيصال" });
  }
});

router.get("/:id/doc/:docType", authMiddleware, async (req, res) => {
  try {
    const { id, docType } = req.params;

    const allowedDocs = new Set(["fatherId", "motherId", "astatement", "marriageCert", "receipt", "certificateImage"]);
    if (!allowedDocs.has(docType)) return res.status(400).json({ message: "نوع المستند غير صحيح" });

    const request = await BirthRequest.findById(id);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    if (["staff", "admin", "superadmin"].includes(req.user?.role) && !["admin", "superadmin"].includes(req.user?.role)) {
      const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      if (!permissions.includes("verify_documents")) {
        return res.status(403).json({ message: "ليست لديك صلاحية عرض المستندات" });
      }
    }

    const filePath = resolveUploadedPath(request[docType]);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "المستند غير موجود على السيرفر" });
    }

    return sendSecureFile(res, filePath);
  } catch {
    return res.status(500).json({ message: "فشل تحميل المستند" });
  }
});

export default router;