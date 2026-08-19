import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CloseButton from "../components/CloseButton";
import api from "../services/api";
import "./TrackRequest.css";

const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
};

const CORRECTION_FIELDS = [
  { value: "childName", label: "اسم المولود" },
  { value: "birthDate", label: "تاريخ الميلاد" },
  { value: "gender", label: "النوع" },
  { value: "fatherName", label: "اسم الأب" },
  { value: "motherName", label: "اسم الأم" },
  { value: "birthPlace", label: "مكان الميلاد" },
  { value: "certificateNumber", label: "رقم الشهادة" },
  { value: "other", label: "أخرى" }
];

function statusLabel(status) {
  switch (status) {
    case "pending_payment": return "منتظر الدفع في السجل";
    case "pending": return "قيد المراجعة";
    case "waiting_verification": return "بانتظار التحقق من الإيصال";
    case "approved": return "تمت الموافقة وقيد التجهيز";
    case "ready": return "جاهز للاستلام";
    case "rejected": return "مرفوض";
    case "needs_revision": return "طلب تعديل";
    case "payment_issue": return "مشكلة في الدفع";
    default: return status || "-";
  }
}

function paymentMethodLabel(method) {
  switch (method) {
    case "cash": return "دفع نقدي";
    case "online": return "دفع إلكتروني";
    case "bank_transfer": return "تحويل بنكي";
    default: return method || "-";
  }
}

function refundStatusLabel(value) {
  switch (value) {
    case "pending_refund": return "بانتظار الاسترداد";
    case "refunded": return "تم الاسترداد";
    case "not_required": return "لا يوجد استرداد";
    default: return value || "-";
  }
}

function resolutionStatusLabel(value) {
  switch (value) {
    case "none": return "لم يبدأ";
    case "requested": return "تم إرسال الطلب";
    case "under_review": return "قيد المراجعة";
    case "approved": return "تمت الموافقة";
    case "resolved": return "تمت المعالجة";
    default: return value || "-";
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG");
}

function normalizeStatusHistory(history = []) {
  if (!Array.isArray(history)) return [];
  const normalized = history
    .slice()
    .reverse()
    .map((item) => ({
      status: statusLabel(item?.status),
      note: String(item?.note || "").trim(),
      changedAt: item?.changedAt || ""
    }))
    .filter((item) => item.status || item.note);

  const deduped = [];
  const seen = new Set();

  for (const item of normalized) {
    const key = `${item.status}__${item.note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export default function TrackRequest() {
  const navigate = useNavigate();

  const [number, setNumber] = useState("");
  const [result, setResult] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revisionField, setRevisionField] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [paymentResolutionNote, setPaymentResolutionNote] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const visibleHistory = useMemo(
    () => normalizeStatusHistory(result?.statusHistory || []),
    [result?.statusHistory]
  );

  const search = async () => {
    setError("");
    setResult(null);
    setCertificateUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return "";
    });
    setShowCertificatePreview(false);

    const cleanNumber = String(number || "").trim().toUpperCase();
    if (!cleanNumber) {
      setError("يرجى إدخال رقم الطلب");
      return;
    }

    setLoading(true);
    try {
      const data = await api.get(`/requests/track/${encodeURIComponent(cleanNumber)}`);
      setResult(data);
    } catch (e) {
      setError(e.message || "الطلب غير موجود");
    } finally {
      setLoading(false);
    }
  };

  const openCertificate = async () => {
    if (!result?._id) return;
    try {
      const blob = await api.getBlob(`/requests/${result._id}/doc/certificateImage`);
      const url = URL.createObjectURL(blob);
      setCertificateUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setShowCertificatePreview(true);
    } catch (e) {
      alert(e.message || "تعذر تحميل صورة الشهادة");
    }
  };

  const closeCertificatePreview = () => {
    setShowCertificatePreview(false);
  };

  const downloadCertificate = async () => {
    if (!result?._id) return;
    try {
      const blob = await api.getBlob(`/requests/${result._id}/doc/certificateImage`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${result.requestNumber || "request"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert(e.message || "تعذر تنزيل صورة الشهادة");
    }
  };

  const requestCorrection = async () => {
    if (!result?._id) return;
    if (!revisionField || !revisionReason.trim()) {
      alert("يرجى تحديد موضع الخطأ وسبب التعديل");
      return;
    }

    setSubmittingRevision(true);
    try {
      const data = await api.post(`/requests/${result._id}/request-correction`, {
        revisionField,
        revisionReason
      });
      setResult(data.request || data);
      setRevisionField("");
      setRevisionReason("");
      alert("تم إرسال الطلب للتعديل بنجاح");
    } catch (e) {
      alert(e.message || "فشل إرسال طلب التعديل");
    } finally {
      setSubmittingRevision(false);
    }
  };

  const requestPaymentResolution = async () => {
    if (!result?._id) return;
    if (!paymentResolutionNote.trim()) {
      alert("يرجى كتابة طلب المعالجة");
      return;
    }

    setSubmittingResolution(true);
    try {
      const data = await api.post(`/requests/${result._id}/request-payment-resolution`, {
        note: paymentResolutionNote
      });
      setResult(data.request || data);
      setPaymentResolutionNote("");
      alert("تم إرسال طلب معالجة مشكلة الدفع");
    } catch (e) {
      alert(e.message || "فشل إرسال طلب المعالجة");
    } finally {
      setSubmittingResolution(false);
    }
  };

  const showCertificateSection =
    result?.status === "ready" && result?.certificateImageAvailable;

  const getStatusClass = (st) => {
    if (st === "ready") return "track-status-ready";
    if (st === "rejected") return "track-status-rejected";
    if (st === "payment_issue") return "track-status-payment_issue";
    return "track-status-default";
  };

  return (
    <>
      <CloseButton />
      <div className="track-page">
        <div className="track-wrapper">
          <div className="track-header-card">
            <h1 className="track-page-title">متابعة حالة الطلب</h1>
            <p className="track-page-subtitle">
              أدخل رقم المعاملة للاطلاع على حالة المعاملة واستعراض الشهادة الصادرة.
            </p>
          </div>

          <div className="track-search-card">
            <div className="track-search-grid">
              <div className="track-input-wrap">
                <label className="track-label">رقم الطلب</label>
                <input
                  type="text"
                  placeholder="مثال: BC-2026-XXXXXX"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="track-input"
                />
              </div>

              <div className="track-search-actions">
                <button onClick={search} disabled={loading} className="btn-track-primary">
                  <Icons.Search />
                  <span>{loading ? "جاري البحث..." : "بحث"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/", { replace: true })}
                  className="btn-track-secondary"
                >
                  الرئيسية
                </button>
              </div>
            </div>

            {error && <p className="track-error">{error}</p>}
          </div>

          {result && (
            <div className="track-content-grid">
              <div className="track-main-card">
                <div className="track-card-header">
                  <h2 className="track-card-title">بيانات الطلب</h2>
                  <span className={`track-status-badge ${getStatusClass(result.status)}`}>
                    {statusLabel(result.status)}
                  </span>
                </div>

                <div className="track-info-grid">
                  <div className="track-info-item">
                    <span className="track-info-label">رقم الطلب</span>
                    <span className="track-info-value">{result.requestNumber}</span>
                  </div>

                  <div className="track-info-item">
                    <span className="track-info-label">اسم المولود</span>
                    <span className="track-info-value">{result.childName || "-"}</span>
                  </div>

                  <div className="track-info-item">
                    <span className="track-info-label">طريقة الدفع</span>
                    <span className="track-info-value">{paymentMethodLabel(result.paymentMethod)}</span>
                  </div>

                  {result.certificateNumber && result.status === "ready" && (
                    <div className="track-info-item">
                      <span className="track-info-label">رقم الشهادة</span>
                      <span className="track-info-value">{result.certificateNumber}</span>
                    </div>
                  )}

                  {result.revisionRequestNumber && (
                    <div className="track-info-item">
                      <span className="track-info-label">رقم التعديل</span>
                      <span className="track-info-value">{result.revisionRequestNumber}</span>
                    </div>
                  )}
                </div>

                {(result.rejectionReason ||
                  result.paymentIssueReason ||
                  result.refundStatus !== "not_required" ||
                  result.revisionField ||
                  result.revisionReason) && (
                  <div className="track-notes-box">
                    {result.rejectionReason && (
                      <p className="track-note-line">
                        <strong>سبب الرفض:</strong> {result.rejectionReason}
                      </p>
                    )}

                    {result.paymentIssueReason && (
                      <p className="track-note-line">
                        <strong>مشكلة الدفع:</strong> {result.paymentIssueReason}
                      </p>
                    )}

                    {result.refundStatus && result.refundStatus !== "not_required" && (
                      <p className="track-note-line">
                        <strong>حالة الاسترداد:</strong> {refundStatusLabel(result.refundStatus)}
                      </p>
                    )}

                    {result.revisionField && (
                      <p className="track-note-line">
                        <strong>موضع التعديل:</strong> {result.revisionField}
                      </p>
                    )}

                    {result.revisionReason && (
                      <p className="track-note-line">
                        <strong>سبب التعديل:</strong> {result.revisionReason}
                      </p>
                    )}
                  </div>
                )}

                {result.status === "payment_issue" && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
                    <h3 className="track-section-title">معالجة مشكلة الدفع</h3>
                    <p className="track-section-help">
                      تم رصد فرق في المبلغ قدره <strong>{result.paymentDifferenceAmount || 0} جنيه</strong>.
                    </p>

                    {result.paymentResolutionRequested ? (
                      <div className="track-notes-box">
                        <p className="track-note-line">
                          <strong>طلب المعالجة:</strong> {result.paymentResolutionNote || "-"}
                        </p>
                        <p className="track-note-line">
                          <strong>حالة الطلب:</strong> {resolutionStatusLabel(result.paymentResolutionStatus)}
                        </p>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={paymentResolutionNote}
                          onChange={(e) => setPaymentResolutionNote(e.target.value)}
                          placeholder="اكتب ملاحظتك لإرسالها لموظف السجل"
                          className="track-textarea"
                        />
                        <button
                          type="button"
                          onClick={requestPaymentResolution}
                          disabled={submittingResolution}
                          className="btn-track-primary"
                          style={{ marginTop: 10 }}
                        >
                          {submittingResolution ? "جارٍ الإرسال..." : "إرسال طلب معالجة"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {showCertificateSection && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
                    <h3 className="track-section-title">صورة الشهادة الرسمية</h3>
                    <div className="track-certificate-actions">
                      <button type="button" onClick={openCertificate} className="btn-track-secondary">
                        <Icons.Eye />
                        <span>معاينة الشهادة</span>
                      </button>
                      <button type="button" onClick={downloadCertificate} className="btn-track-secondary">
                        <Icons.Download />
                        <span>تنزيل الملف</span>
                      </button>
                    </div>

                    {certificateUrl && showCertificatePreview && (
                      <div className="track-preview-panel">
                        <div className="track-preview-panel-header">
                          <strong>معاينة الشهادة</strong>
                          <button
                            type="button"
                            onClick={closeCertificatePreview}
                            className="btn-track-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                          >
                            إغلاق
                          </button>
                        </div>
                        <iframe src={certificateUrl} title="certificate" className="track-preview-frame" />
                      </div>
                    )}
                  </div>
                )}

                {result.status === "ready" && result.certificateImageAvailable && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
                    <h3 className="track-section-title">طلب تعديل بيانات الشهادة</h3>
                    <p className="track-section-help">
                      في حال وجود أي خطأ بالشهادة، حدد موضع الخطأ لإعادة الطلب لقسم المراجعة.
                    </p>

                    <select
                      value={revisionField}
                      onChange={(e) => setRevisionField(e.target.value)}
                      className="track-input"
                      style={{ marginBottom: 10 }}
                    >
                      <option value="">اختر موضع الخطأ</option>
                      {CORRECTION_FIELDS.map((item) => (
                        <option key={item.value} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <textarea
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="اكتب التعديل المطلوب بدقة"
                      className="track-textarea"
                    />

                    <button
                      type="button"
                      onClick={requestCorrection}
                      disabled={submittingRevision}
                      className="btn-track-primary"
                      style={{ marginTop: 10 }}
                    >
                      {submittingRevision ? "جارٍ الإرسال..." : "إرسال طلب التعديل"}
                    </button>
                  </div>
                )}
              </div>

              <div className="track-side-card">
                <h2 className="track-card-title" style={{ marginBottom: 16 }}>سجل مراحل المعاملة</h2>

                {visibleHistory.length > 0 ? (
                  <div className="track-timeline">
                    {visibleHistory.map((item, idx) => (
                      <div key={`${item.status}-${idx}`} className="track-timeline-item">
                        <div className="track-timeline-dot" />
                        <div className="track-timeline-content">
                          <div className="track-timeline-status">{item.status}</div>
                          {item.note && <div className="track-timeline-note">{item.note}</div>}
                          {item.changedAt && (
                            <div className="track-timeline-date">{formatDate(item.changedAt)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="track-empty-box">لا يوجد سجل تاريخي لهذا الطلب.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}