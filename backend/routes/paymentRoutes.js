import { randomInt, createHmac, timingSafeEqual } from "crypto";
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import BirthRequest from "../models/BirthRequest.js";

const router = express.Router();

function canAccessRequest(request, req) {
  const userId = req.user?.id || req.user?._id;
  if (["staff", "admin", "superadmin"].includes(req.user?.role)) return true;
  return String(request.user) === String(userId);
}

function appendHistory(request, status, note, req) {
  request.statusHistory.push({
    status,
    note,
    changedByRole: req.user?.role || "system",
    changedByName: req.user?.name || "النظام",
    changedAt: new Date(),
  });
}

const YALLAPAY_API_URL = process.env.YALLAPAY_API_URL || "https://gateway.yallapaysudan.com/api/v1";
const YALLAPAY_API_KEY = process.env.YALLAPAY_API_KEY || "";
const YALLAPAY_SECRET = process.env.YALLAPAY_WEBHOOK_SECRET || "";
const IS_CONFIGURED = Boolean(YALLAPAY_API_KEY);

async function createYallaPaySession({ amount, orderId, description, returnUrl, cancelUrl }) {
  const res = await fetch(`${YALLAPAY_API_URL}/gateway/generatePaymentLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${YALLAPAY_API_KEY}` },
    body: JSON.stringify({
      amount,
      clientReferenceId: orderId,
      description,
      paymentSuccessfulRedirectUrl: returnUrl,
      paymentFailedRedirectUrl: cancelUrl,
      commissionPaidByCustomer: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `YallaPay error: ${res.status}`);
  }
  return res.json();
}

function verifyWebhookSignature(rawBody, sigHeader) {
  if (!YALLAPAY_SECRET) return false;
  const expected = createHmac("sha256", YALLAPAY_SECRET).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sigHeader || ""), Buffer.from(expected));
  } catch {
    return false;
  }
}

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { requestId, channel } = req.body || {};
    if (!requestId) return res.status(400).json({ message: "معرّف الطلب مطلوب" });

    const request = await BirthRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });
    if (request.paymentMethod !== "online") return res.status(400).json({ message: "هذا الطلب ليس دفعًا إلكترونيًا" });

    const orderId = `BC-${request.requestNumber}-${randomInt(1000, 9999)}`;
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";

    request.paymentChannel = channel || "card";
    request.transferRef = orderId;
    request.paid = false;
    request.paymentVerified = false;
    request.status = "pending_payment";

    if (IS_CONFIGURED) {
      const session = await createYallaPaySession({
        amount: Number(request.paymentExpectedAmount || 5000),
        orderId,
        description: `رسوم استخراج شهادة ميلاد — ${request.requestNumber}`,
        returnUrl: `${baseUrl}/payment-success?ref=${orderId}`,
        cancelUrl: `${baseUrl}/payment?cancelled=1`,
      });

      appendHistory(request, "pending_payment", "تم إنشاء جلسة دفع عبر YallaPay", req);
      await request.save();

      return res.json({
        mode: "yallapay",
        requestId: request._id,
        requestNumber: request.requestNumber,
        paymentReference: orderId,
        checkoutUrl: session.paymentUrl || session.redirect_url || session.checkoutUrl,
      });
    }

    appendHistory(request, "pending_payment", "الدفع الإلكتروني غير مهيأ — يرجى التحويل البنكي", req);
    await request.save();
    return res.status(503).json({
      message: "بوابة الدفع الإلكتروني غير مهيأة. يرجى اختيار التحويل البنكي.",
      fallback: "bank_transfer",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "فشل إنشاء جلسة الدفع" });
  }
});

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.body || {};
    if (!requestId) return res.status(400).json({ message: "بيانات التحقق غير مكتملة" });

    const request = await BirthRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "الطلب غير موجود" });
    if (!canAccessRequest(request, req)) return res.status(403).json({ message: "ليس لديك صلاحية" });

    if (request.paid && request.paymentVerified) {
      return res.json({ message: "تم تأكيد الدفع مسبقاً", requestNumber: request.requestNumber });
    }

    return res.status(402).json({ message: "لم يتم تأكيد الدفع بعد. يُؤكَّد تلقائياً فور إتمام العملية." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "فشل التحقق" });
  }
});

router.post("/webhook/yallapay", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const sig = req.headers["yallapay-signature"] || req.headers["x-yallapay-signature"] || "";
    const rawBody = req.body;

    if (YALLAPAY_SECRET && !verifyWebhookSignature(rawBody, sig)) {
      return res.status(401).json({ message: "توقيع غير صالح" });
    }

    const payload = JSON.parse(rawBody.toString());
    const { clientReferenceId, status, paymentReferenceId } = payload;

    if (!clientReferenceId) return res.status(400).json({ message: "clientReferenceId مطلوب" });

    const request = await BirthRequest.findOne({ transferRef: clientReferenceId });
    if (!request) {
      return res.status(200).json({ received: true });
    }

    if (["SUCCESSFUL", "paid", "completed"].includes(status)) {
      if (!request.paid) {
        request.paid = true;
        request.paymentVerified = true;
        request.status = "pending";
        request.statusHistory.push({
          status: "pending",
          note: `تم تأكيد الدفع تلقائياً — مرجع: ${paymentReferenceId || ""}`,
          changedByRole: "system",
          changedByName: "YallaPay",
          changedAt: new Date(),
        });
        await request.save();
      }
    } else if (["FAILED", "failed", "cancelled"].includes(status)) {
      request.status = "pending_payment";
      request.statusHistory.push({
        status: "pending_payment",
        note: `فشلت محاولة الدفع — الحالة: ${status}`,
        changedByRole: "system",
        changedByName: "YallaPay",
        changedAt: new Date(),
      });
      await request.save();
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({ message: "خطأ في معالجة الـ webhook" });
  }
});

export default router;