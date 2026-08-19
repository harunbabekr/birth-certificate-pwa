import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { getStoredUser } from "../services/api";
import "./StaffDashboard.css";

const Icons = {
  Clock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Archive: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  )
};

const DOCUMENTS = [
  { key: "fatherId", label: "هوية الأب" },
  { key: "motherId", label: "هوية الأم" },
  { key: "astatement", label: "الإفادة الرسمية" },
  { key: "marriageCert", label: "قسيمة الزواج" },
  { key: "receipt", label: "إشعار التحويل البنكي" },
  { key: "certificateImage", label: "صورة الشهادة" }
];

function guessMimeType(filePath = "") {
  const lower = String(filePath || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function buildDownloadName(label, filePath = "") {
  const fileName = String(filePath || "").split(/[\\/]/).pop() || "document";
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  return `${label}${extension}`;
}

export default function StaffDashboard() {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [searchArchive, setSearchArchive] = useState("");
  const [searchPending, setSearchPending] = useState("");
  const [pendingStatus, setPendingStatus] = useState("pending");
  const [archiveStatus, setArchiveStatus] = useState("approved");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [loadingDeleteId, setLoadingDeleteId] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState("");
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issuingDate, setIssuingDate] = useState("");
  const [revisionFixedCertificateFile, setRevisionFixedCertificateFile] = useState(null);
  const [revisionFixedCertificateNumber, setRevisionFixedCertificateNumber] = useState("");
  const [revisionFixedIssuingDate, setRevisionFixedIssuingDate] = useState("");

  const previewUrlRef = useRef("");

  const archiveQuery = useMemo(() => searchArchive.trim(), [searchArchive]);
  const pendingQuery = useMemo(() => searchPending.trim(), [searchPending]);
  const userPermissions = useMemo(
    () => new Set(Array.isArray(currentUser?.permissions) ? currentUser.permissions : []),
    [currentUser]
  );

  const isAdmin = currentUser?.role === "admin";
  const canViewRequests = isAdmin || userPermissions.has("view_requests");
  const canVerifyDocuments = isAdmin || userPermissions.has("verify_documents");
  const canVerifyPayments = isAdmin || userPermissions.has("verify_payments");
  const canApproveRequests = isAdmin || userPermissions.has("approve_requests");
  const canMarkReady = isAdmin || userPermissions.has("mark_ready");

  const releasePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }, []);

  const clearPreview = useCallback(() => {
    releasePreviewUrl();
    setPreviewDoc(null);
    setPreviewError("");
    setPreviewLoading(false);
  }, [releasePreviewUrl]);

  const loadCurrentUser = async () => {
    try {
      const data = await api.get("/auth/me");
      if (data?.user) {
        setCurrentUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
    } catch { /* empty */ }
  };

  const fetchPending = useCallback(async () => {
    if (!canViewRequests) {
      setLoading(false);
      setListLoading(false);
      setError("ليس لديك صلاحية عرض الطلبات");
      return;
    }

    if (!initialLoaded) setLoading(true);
    else setListLoading(true);

    setError("");

    try {
      const qPart = pendingQuery ? `&q=${encodeURIComponent(pendingQuery)}` : "";
      const data = await api.get(`/requests?status=${pendingStatus}${qPart}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "ليس لديك صلاحية للوصول");
    } finally {
      setLoading(false);
      setListLoading(false);
      setInitialLoaded(true);
    }
  }, [canViewRequests, pendingQuery, pendingStatus, initialLoaded]);

  const fetchArchive = useCallback(async () => {
    if (!canViewRequests) {
      setLoading(false);
      setListLoading(false);
      setError("ليس لديك صلاحية عرض الطلبات");
      return;
    }

    if (!initialLoaded) setLoading(true);
    else setListLoading(true);

    setError("");

    try {
      const qPart = archiveQuery ? `&q=${encodeURIComponent(archiveQuery)}` : "";
      const data = await api.get(`/requests?status=${archiveStatus}${qPart}`);
      setArchive(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "ليس لديك صلاحية للوصول");
    } finally {
      setLoading(false);
      setListLoading(false);
      setInitialLoaded(true);
    }
  }, [canViewRequests, archiveQuery, archiveStatus, initialLoaded]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    setInitialLoaded(false);
  }, [tab]);

  useEffect(() => {
    if (tab === "pending") fetchPending();
    else fetchArchive();
  }, [tab, fetchPending, fetchArchive]);

  useEffect(() => {
    if (tab !== "archive") return undefined;
    const timer = setTimeout(() => fetchArchive(), 350);
    return () => clearTimeout(timer);
  }, [tab, fetchArchive]);

  useEffect(() => {
    if (tab !== "pending") return undefined;
    const timer = setTimeout(() => fetchPending(), 350);
    return () => clearTimeout(timer);
  }, [tab, fetchPending]);

  useEffect(() => {
    clearPreview();
  }, [selected?._id, clearPreview]);

  useEffect(() => {
    return () => releasePreviewUrl();
  }, [releasePreviewUrl]);

  const updateStatus = async (id, status) => {
    let payload = { status };

    if (status === "rejected") {
      const rejectionReason = window.prompt("اكتب سبب الرفض:", selected?.rejectionReason || "");
      if (!rejectionReason) return;
      payload = { status, rejectionReason };
    }

    if (!canApproveRequests) {
      alert("ليس لديك صلاحية قبول أو رفض الطلبات");
      return;
    }

    try {
      const updated = await api.post(`/requests/${id}/status`, payload);
      setRequests((prev) => prev.filter((item) => item._id !== id));

      if (["approved", "rejected", "needs_revision", "payment_issue", "ready"].includes(status)) {
        setArchive((prev) => [updated, ...prev]);
      }

      setSelected(null);
    } catch (e) {
      alert(e.message || "فشل تحديث الحالة");
    }
  };

  const resolvePaymentIssue = async (request, action) => {
    let note = "";

    if (action === "reject") {
      note = window.prompt("اكتب سبب الرفض المالي:", request?.paymentIssueReason || "");
      if (!note) return;
    }

    if (action === "require_additional_payment") {
      note =
        window.prompt(
          "اكتب ملاحظة للمستخدم بخصوص إكمال فرق المبلغ:",
          "يرجى إكمال فرق المبلغ ثم إعادة الرفع"
        ) || "";
      if (!note) return;
    }

    if (action === "approve_with_refund_pending") {
      note =
        window.prompt(
          "اكتب ملاحظة الاعتماد مع بقاء الاسترداد معلقًا:",
          "تم اعتماد الطلب مع بقاء فرق المبلغ قيد الاسترداد"
        ) || "";
    }

    if (action === "mark_refunded") {
      note =
        window.prompt(
          "اكتب ملاحظة الاسترداد:",
          "تم استرداد فرق المبلغ واعتماد الطلب"
        ) || "";
    }

    try {
      const res = await api.post(`/requests/${request._id}/resolve-payment-issue`, {
        action,
        note
      });
      const updated = res?.request || res;

      setRequests((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setArchive((prev) => {
        const exists = prev.some((item) => item._id === updated._id);
        if (exists) return prev.map((item) => (item._id === updated._id ? updated : item));
        return [updated, ...prev];
      });

      if (["approved", "rejected"].includes(updated.status)) {
        setRequests((prev) => prev.filter((item) => item._id !== updated._id));
      }

      setSelected(updated);
      alert("تمت معالجة مشكلة الدفع بنجاح");
    } catch (e) {
      alert(e.message || "فشل معالجة مشكلة الدفع");
    }
  };

  const reportPaymentIssueManual = async (request, issueType) => {
    const differenceRaw = window.prompt(
      issueType === "overpaid"
        ? "أدخل مقدار الزيادة في المبلغ:"
        : "أدخل مقدار النقص في المبلغ:",
      ""
    );
    if (!differenceRaw) return;

    const differenceAmount = Number(differenceRaw);
    if (!differenceAmount || differenceAmount <= 0) {
      alert("يرجى إدخال فرق مبلغ صحيح");
      return;
    }

    const defaultReason =
      issueType === "overpaid"
        ? `المبلغ المدفوع أكبر من المطلوب بمقدار ${differenceAmount} جنيه`
        : `المبلغ المدفوع أقل من المطلوب بمقدار ${differenceAmount} جنيه`;

    const reason = window.prompt("اكتب سبب المشكلة المالية:", defaultReason);
    if (!reason) return;

    try {
      const res = await api.post(`/requests/${request._id}/report-payment-issue-manual`, {
        issueType,
        differenceAmount,
        reason
      });

      const updated = res?.request || res;
      setRequests((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      setSelected(updated);
      alert("تم تسجيل مشكلة الدفع بنجاح");
    } catch (e) {
      alert(e.message || "فشل تسجيل مشكلة الدفع");
    }
  };

  const confirmCashAndApprove = async (request) => {
    if (!canVerifyPayments) {
      alert("ليس لديك صلاحية التحقق من الدفع");
      return;
    }

    try {
      const res = await api.post(`/requests/${request._id}/confirm-cash-payment`, {});
      const updatedRequest = res?.request || res;

      setRequests((prev) => prev.filter((item) => item._id !== request._id));
      setArchive((prev) => [updatedRequest, ...prev]);
      setSelected(null);

      alert("تم تأكيد الدفع وقبول الطلب.");
    } catch (e) {
      alert(e.message || "فشل تأكيد الدفع");
    }
  };

  const confirmBankTransferAndApprove = async (request) => {
    if (!canVerifyPayments) {
      alert("ليس لديك صلاحية التحقق من الدفع البنكي");
      return;
    }

    const reviewNotes = "تم التحقق من الدفع البنكي واعتماد الطلب";

    try {
      const res = await api.post(`/requests/${request._id}/confirm-bank-transfer`, {
        reviewNotes
      });
      const updatedRequest = res?.request || res;

      setRequests((prev) => prev.filter((item) => item._id !== request._id));
      setArchive((prev) => [updatedRequest, ...prev]);
      setSelected(null);

      alert("تم التحقق من الدفع البنكي وقبول الطلب.");
    } catch (e) {
      alert(e.message || "فشل تأكيد الدفع البنكي");
    }
  };

  const markReady = async (request) => {
    if (!canMarkReady) {
      alert("ليس لديك صلاحية جعل الطلب جاهزًا للاستلام");
      return;
    }

    if (!request?.certificateImage || !request?.certificateNumber || !request?.issuedAt) {
      alert("يجب أولًا رفع صورة الشهادة وإدخال رقم الشهادة وتاريخ الإصدار قبل جعل الطلب جاهزًا للاستلام.");
      return;
    }

    try {
      const res = await api.post(`/requests/${request._id}/mark-ready`, {});
      const updated = res?.request || res;

      setArchive((prev) => prev.map((item) => (item._id === request._id ? updated : item)));
      setSelected(updated);

      alert("تم جعل الطلب جاهزًا للاستلام.");
    } catch (e) {
      alert(e.message || "فشل تحديث الحالة إلى جاهز للاستلام");
    }
  };

  const deleteSingleRequest = async (requestId) => {
    if (!window.confirm("هل تريد حذف هذا الطلب نهائيًا؟")) return;

    try {
      setLoadingDeleteId(requestId);
      await api.delete(`/requests/${requestId}`);

      setRequests((prev) => prev.filter((item) => item._id !== requestId));
      setArchive((prev) => prev.filter((item) => item._id !== requestId));

      if (selected?._id === requestId) setSelected(null);

      alert("تم حذف الطلب بنجاح");
    } catch (e) {
      alert(e.message || "تعذر حذف الطلب");
    } finally {
      setLoadingDeleteId("");
    }
  };

  const deleteAllInSection = async (section) => {
    const sectionLabel = section === "review" ? "طلبات قيد المراجعة" : "الأرشيف";
    if (!window.confirm(`هل تريد حذف كل ${sectionLabel}؟`)) return;

    try {
      setBulkDeleting(section);
      await api.delete(`/requests/bulk/remove?section=${section}`);

      if (section === "review") setRequests([]);
      else setArchive([]);

      if (selected) setSelected(null);
      alert(`تم حذف ${sectionLabel} بنجاح`);
    } catch (e) {
      alert(e.message || "تعذر حذف الطلبات");
    } finally {
      setBulkDeleting("");
    }
  };

  const previewDocument = async (docType, label) => {
    if (!selected?._id) return;
    if (!canVerifyDocuments) {
      alert("ليس لديك صلاحية عرض المستندات");
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");

    try {
      const blob = await api.getBlob(`/requests/${selected._id}/doc/${docType}`);
      const objectUrl = URL.createObjectURL(blob);
      releasePreviewUrl();
      previewUrlRef.current = objectUrl;

      setPreviewDoc({
        type: docType,
        label,
        url: objectUrl,
        mimeType: blob.type || guessMimeType(selected?.[docType]),
        downloadName: buildDownloadName(label, selected?.[docType])
      });
    } catch (e) {
      setPreviewDoc(null);
      setPreviewError(e.message || "تعذر تحميل المستند");
    } finally {
      setPreviewLoading(false);
    }
  };

  const uploadCertificate = async () => {
    if (!selected?._id) return;

    if (!certificateFile) {
      alert("اختر صورة الشهادة أولًا");
      return;
    }

    if (!certificateNumber.trim()) {
      alert("أدخل رقم الشهادة");
      return;
    }

    if (!issuingDate) {
      alert("أدخل تاريخ الإصدار");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("certificateImage", certificateFile);
      formData.append("certificateNumber", certificateNumber);
      formData.append("issuedAt", issuingDate);

      const res = await api.postForm(`/requests/${selected._id}/certificate`, formData);
      const updated = res?.request || res;

      setArchive((prev) => prev.map((item) => (item._id === selected._id ? updated : item)));
      setSelected(updated);
      setCertificateFile(null);

      alert("تم رفع صورة الشهادة بنجاح.");
    } catch (e) {
      alert(e.message || "فشل رفع صورة الشهادة");
    }
  };

  const resendAfterRevision = async () => {
    if (!selected?._id) return;
    if (!revisionFixedCertificateFile) {
      alert("اختر صورة الشهادة المصححة أولًا");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("certificateImage", revisionFixedCertificateFile);
      if (revisionFixedCertificateNumber) {
        formData.append("certificateNumber", revisionFixedCertificateNumber);
      }
      if (revisionFixedIssuingDate) {
        formData.append("issuedAt", revisionFixedIssuingDate);
      }
      formData.append("reviewNotes", "تمت معالجة طلب التعديل وإعادة إرسال الشهادة");

      const res = await api.postForm(`/requests/${selected._id}/revision-completed`, formData);
      const updated = res?.request || res;

      setArchive((prev) => prev.map((item) => (item._id === selected._id ? updated : item)));
      setSelected(updated);
      setRevisionFixedCertificateFile(null);
      setRevisionFixedCertificateNumber("");
      setRevisionFixedIssuingDate("");

      alert("تمت إعادة إرسال الشهادة بعد التعديل بنجاح");
    } catch (e) {
      alert(e.message || "فشل إعادة إرسال الشهادة بعد التعديل");
    }
  };

  const currentList = tab === "pending" ? requests : archive;
  const isBankTransfer = selected?.paymentMethod === "bank_transfer";
  const previewIsImage = previewDoc?.mimeType?.startsWith("image/");
  const previewIsPdf = /pdf/i.test(previewDoc?.mimeType || "");

  if (loading) return <p className="staff-loading">جاري تحميل البيانات...</p>;
  if (error) return <p className="staff-error">{error}</p>;

  return (
    <div className="staff-dashboard-page">
      <div className="staff-page-shell">
        <header className="compact-hero">
          <h1>لوحة معالجة الطلبات</h1>
          <p>مراجعة طلبات استخراج شهادات الميلاد، التدقيق المالي، والاعتماد الرسمي.</p>
        </header>

        <div className="staff-tabs">
          <button
            className={`staff-tab ${tab === "pending" ? "active" : ""}`}
            onClick={() => setTab("pending")}
            type="button"
          >
            <Icons.Clock />
            <span>الطلبات قيد المراجعة</span>
          </button>

          <button
            className={`staff-tab ${tab === "archive" ? "active" : ""}`}
            onClick={() => setTab("archive")}
            type="button"
          >
            <Icons.Archive />
            <span>الأرشيف والمعاملات المكتملة</span>
          </button>
        </div>

        <div className="modern-section">
          <div className="compact-section-header">
            <div className="section-heading">
              <h2>{tab === "pending" ? "الطلبات الحالية" : "سجل الأرشيف"}</h2>
              <p>
                {tab === "pending"
                  ? "تدقيق بيانات المواليد، مطابقة المستندات المرفوعة، وتأكيد التحويلات المالية."
                  : "سجل المعاملات المعتمدة، الجاهزة للتسليم، وطلبات التعديل."}
              </p>
            </div>

            <button
              className="danger-outline-btn"
              onClick={() => deleteAllInSection(tab === "pending" ? "review" : "archive")}
              disabled={bulkDeleting === (tab === "pending" ? "review" : "archive") || currentList.length === 0}
              type="button"
            >
              <Icons.Trash />
              <span>{bulkDeleting === (tab === "pending" ? "review" : "archive") ? "جاري الحذف..." : "حذف المعاملات المحددة"}</span>
            </button>
          </div>

          <div className="modern-tools">
            {tab === "pending" && (
              <>
                <div className="field">
                  <label>تصفية حسب الحالة</label>
                  <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}>
                    <option value="pending_payment">في انتظار الدفع بالسجل</option>
                    <option value="pending">قيد المراجعة والتدقيق</option>
                    <option value="waiting_verification">في انتظار مطابقة الإشعار البنكي</option>
                    <option value="payment_issue">مشاكل وفروقات الدفع</option>
                  </select>
                </div>

                <div className="field">
                  <label>بحث برقم الطلب أو الاسم</label>
                  <input
                    value={searchPending}
                    onChange={(e) => setSearchPending(e.target.value)}
                    placeholder="مثال: BC-2026-XXXXXX أو اسم المولود"
                  />
                </div>
              </>
            )}

            {tab === "archive" && (
              <>
                <div className="field">
                  <label>قسم الأرشيف</label>
                  <select value={archiveStatus} onChange={(e) => setArchiveStatus(e.target.value)}>
                    <option value="approved">الطلبات المعتمدة</option>
                    <option value="ready">الشهادات الجاهزة للاستلام</option>
                    <option value="rejected">الطلبات المرفوضة</option>
                    <option value="needs_revision">طلبات التعديل</option>
                    <option value="payment_issue">مشاكل الدفع</option>
                  </select>
                </div>

                <div className="field">
                  <label>بحث في الأرشيف</label>
                  <input
                    value={searchArchive}
                    onChange={(e) => setSearchArchive(e.target.value)}
                    placeholder="مثال: BC-2026-XXXXXX أو اسم المولود"
                  />
                </div>
              </>
            )}
          </div>

          <div className="professional-layout">
            <div className="modern-request-list">
              {listLoading && <div className="empty-state">جاري تحديث القائمة...</div>}

              {!listLoading && currentList.length === 0 && (
                <div className="empty-state">لا توجد طلبات مطابقة في هذا القسم.</div>
              )}

              {!listLoading &&
                currentList.map((request) => (
                  <div
                    key={request._id}
                    className={`modern-request-item ${request.status} ${selected?._id === request._id ? "selected" : ""}`}
                    onClick={() => setSelected(request)}
                  >
                    <div className="request-card-main">
                      <h3>{request.childName}</h3>
                      <p><strong>رقم المعاملة:</strong> {request.requestNumber}</p>
                      {request.revisionRequestNumber && (
                        <p><strong>رقم التعديل:</strong> {request.revisionRequestNumber}</p>
                      )}
                      <p><strong>الحالة:</strong> {request.status}</p>
                    </div>
                  </div>
                ))}
            </div>

            {selected ? (
              <div className="modern-request-details">
                <div className="details-topbar">
                  <div>
                    <h3>بيانات الطلب التفصيلية</h3>
                    <p className="details-subtitle">راجع المرفقات والبيانات قبل تنفيذ الإجراء.</p>
                  </div>

                  <button
                    className="danger-btn"
                    onClick={() => deleteSingleRequest(selected._id)}
                    type="button"
                  >
                    {loadingDeleteId === selected._id ? "جاري الحذف..." : "حذف الطلب"}
                  </button>
                </div>

                <div className="request-meta-grid">
                  <div><strong>اسم المولود:</strong> {selected.childName}</div>
                  <div><strong>رقم الطلب:</strong> {selected.requestNumber}</div>
                  <div><strong>تاريخ التقديم:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "-"}</div>
                  <div><strong>طريقة السداد:</strong> {selected.paymentMethod || "-"}</div>
                  <div><strong>حالة الطلب:</strong> {selected.status || "-"}</div>
                  <div><strong>مقدم الطلب:</strong> {selected.applicantName || "-"}</div>
                  <div><strong>الرقم الوطني:</strong> {selected.applicantNationalId || "-"}</div>
                  <div><strong>صلة القرابة:</strong> {selected.applicantRelation || "-"}</div>
                  <div><strong>مكتب السجل:</strong> {selected.registryOffice || "-"}</div>
                  <div><strong>طريقة الاستلام:</strong> {selected.deliveryMethod || "-"}</div>
                  <div><strong>مكان الميلاد:</strong> {selected.birthPlace || "-"}</div>

                  {selected.status === "ready" && selected.certificateNumber && (
                    <div><strong>رقم الشهادة:</strong> {selected.certificateNumber}</div>
                  )}

                  {selected.status === "ready" && selected.issuedAt && (
                    <div><strong>تاريخ الإصدار:</strong> {new Date(selected.issuedAt).toLocaleDateString()}</div>
                  )}
                </div>

                {selected.rejectionReason && (
                  <div className="info-card">
                    <h4>سبب الرفض</h4>
                    <p>{selected.rejectionReason}</p>
                  </div>
                )}

                {isBankTransfer && (
                  <div className="info-card">
                    <h4>بيانات التحويل البنكي</h4>
                    <div className="bank-grid">
                      <p><strong>حساب السجل:</strong> {selected.transferAccountLabel || "-"}</p>
                      <p><strong>رقم العملية:</strong> {selected.transferTxId || "-"}</p>
                      <p><strong>المبلغ المطلوب:</strong> {selected.paymentExpectedAmount ?? "-"} جنيه</p>
                      <p><strong>مرجع التحويل:</strong> {selected.transferRef || "-"}</p>
                    </div>
                  </div>
                )}

                <h4 className="section-mini-title">المستندات والمرفقات</h4>
                {!canVerifyDocuments && (
                  <p style={{ color: "#dc2626", fontSize: "0.88rem" }}>ليس لديك صلاحية استعراض المرفقات الرسمية.</p>
                )}

                <div className="doc-list">
                  {DOCUMENTS.map((doc) => {
                    if (doc.key === "certificateImage" && selected.status !== "ready") {
                      return null;
                    }

                    const hasFile = Boolean(selected?.[doc.key]);
                    const isCurrentPreview = previewDoc?.type === doc.key;

                    return (
                      <div key={doc.key} className="doc-item">
                        <div>
                          <strong>{doc.label}</strong>
                          <div className="doc-meta">{hasFile ? "تم الرفع بنجاح" : "غير مرفوع"}</div>
                        </div>

                        {hasFile ? (
                          <button
                            type="button"
                            className={`doc-action ${isCurrentPreview ? "active" : ""}`}
                            onClick={() => previewDocument(doc.key, doc.label)}
                            disabled={!canVerifyDocuments}
                          >
                            {isCurrentPreview ? "معروض الآن" : "عرض المستند"}
                          </button>
                        ) : (
                          <span className="doc-missing">غير متوفر</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="doc-preview-card">
                  <div className="doc-preview-header">
                    <h4>معاينة المستند المرفق</h4>
                    {previewDoc?.url && (
                      <a href={previewDoc.url} target="_blank" rel="noreferrer" download={previewDoc.downloadName}>
                        فتح / تنزيل الملف
                      </a>
                    )}
                  </div>

                  {previewLoading && <p>جاري تحميل المستند...</p>}
                  {!previewLoading && previewError && <p style={{ color: "#dc2626" }}>{previewError}</p>}
                  {!previewLoading && !previewError && !previewDoc && (
                    <p style={{ color: "#64748b", margin: 0 }}>اختر مستنداً من القائمة أعلاه لمعاينته هنا.</p>
                  )}
                  {!previewLoading && !previewError && previewDoc && previewIsImage && (
                    <img src={previewDoc.url} alt={previewDoc.label} className="doc-preview-image" />
                  )}
                  {!previewLoading && !previewError && previewDoc && previewIsPdf && (
                    <iframe src={previewDoc.url} title={previewDoc.label} className="doc-preview-frame" />
                  )}
                </div>

                <div className="actions">
                  {tab === "pending" && selected.status === "pending_payment" && canVerifyPayments && (
                    <>
                      <button className="success-btn" onClick={() => confirmCashAndApprove(selected)} type="button">
                        تأكيد استلام الدفع النقدي وقبول الطلب
                      </button>
                      {canApproveRequests && (
                        <button className="secondary-btn" onClick={() => updateStatus(selected._id, "rejected")} type="button">
                          رفض الطلب
                        </button>
                      )}
                    </>
                  )}

                  {tab === "pending" && selected.status === "waiting_verification" && isBankTransfer && canVerifyPayments && (
                    <>
                      <button className="success-btn" onClick={() => confirmBankTransferAndApprove(selected)} type="button">
                        تأكيد مطابقة الإشعار وقبول الطلب
                      </button>
                      <button className="secondary-btn" onClick={() => reportPaymentIssueManual(selected, "underpaid")} type="button">
                        تسجيل نقص في المبلغ
                      </button>
                      <button className="secondary-btn" onClick={() => reportPaymentIssueManual(selected, "overpaid")} type="button">
                        تسجيل زيادة في المبلغ
                      </button>
                      {canApproveRequests && (
                        <button className="danger-btn" onClick={() => updateStatus(selected._id, "rejected")} type="button">
                          رفض الإشعار
                        </button>
                      )}
                    </>
                  )}

                  {tab === "pending" &&
                    !["pending_payment", "waiting_verification", "payment_issue"].includes(selected.status) &&
                    canApproveRequests && (
                      <>
                        <button className="success-btn" onClick={() => updateStatus(selected._id, "approved")} type="button">
                          اعتماد وقبول الطلب
                        </button>
                        <button className="secondary-btn" onClick={() => updateStatus(selected._id, "rejected")} type="button">
                          رفض الطلب
                        </button>
                      </>
                    )}

                  {tab === "archive" && selected.status === "approved" && canMarkReady && (
                    <div className="info-card" style={{ width: "100%", marginTop: 12 }}>
                      <h4>إرفاق وثيقة الشهادة وتفعيل الجاهزية</h4>
                      <div className="bank-grid" style={{ marginBottom: 12 }}>
                        <div className="field">
                          <label>رقم الشهادة الصادرة</label>
                          <input
                            value={certificateNumber}
                            onChange={(e) => setCertificateNumber(e.target.value)}
                            placeholder="أدخل رقم الشهادة"
                          />
                        </div>
                        <div className="field">
                          <label>تاريخ الإصدار</label>
                          <input
                            type="date"
                            value={issuingDate}
                            onChange={(e) => setIssuingDate(e.target.value)}
                          />
                        </div>
                        <div className="field field-full">
                          <label>ملف الشهادة (صورة أو PDF)</label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      </div>

                      <div className="inline-actions">
                        <button className="success-btn" onClick={uploadCertificate} type="button">
                          حفظ صورة الشهادة
                        </button>

                        {selected.certificateImage && (
                          <button className="success-btn" onClick={() => markReady(selected)} type="button">
                            جعل الطلب جاهزاً للاستلام
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button className="secondary-btn" onClick={() => setSelected(null)} type="button">
                    إغلاق التفاصيل
                  </button>
                </div>
              </div>
            ) : (
              <div className="modern-request-details">
                <div className="empty-state">اختر طلباً من القائمة الجانبية لعرض تفاصيله والتحقق من مستنداته.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}