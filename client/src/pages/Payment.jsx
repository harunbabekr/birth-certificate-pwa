import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearDraftRequest, getDraftRequest } from "../services/indexedDB";
import api, { buildRequestFormData } from "../services/api";

const Icons = {
  Bank: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  ArrowBack: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
};

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const guard = async () => {
      const savedDraft = await getDraftRequest().catch(() => null);
      if (!location.state?.fromApply && !savedDraft?.formValues) {
        navigate("/apply", { replace: true });
        return;
      }
      if (!savedDraft?.formValues) {
        navigate("/apply", { replace: true });
        return;
      }
      setDraft(savedDraft);
    };
    guard();
  }, [location.state, navigate]);

  const createBaseRequest = async ({ paymentMethod, paymentChannel }) => {
    if (!draft?.formValues) throw new Error("لا توجد بيانات طلب محفوظة. ارجع إلى صفحة التقديم.");
    const formData = buildRequestFormData(draft.formValues, draft.files, { paymentMethod, paymentChannel });
    return api.postForm("/requests", formData);
  };

  const startBankTransfer = async () => {
    setLoading(true);
    try {
      const data = await createBaseRequest({ paymentMethod: "bank_transfer", paymentChannel: "bank_transfer" });
      const requestId = data?.request?._id;
      const requestNumber = data?.requestNumber || data?.request?.requestNumber;
      if (!requestId || !requestNumber) throw new Error("لم يتم إنشاء الطلب بشكل صحيح");
      await clearDraftRequest();
      localStorage.setItem("pendingBankTransfer", JSON.stringify({ requestId, requestNumber, method: "bank_transfer" }));
      navigate("/bank-transfer", { state: { requestId, requestNumber, method: "bank_transfer" }, replace: true });
    } catch (error) {
      alert(error.message || "فشل تجهيز التحويل البنكي");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>طريقة سداد الرسوم</h2>
        <p style={styles.subtitle}>اختر طريقة الدفع المناسبة لمتابعة استخراج شهادة الميلاد.</p>

        <div style={styles.actions}>
          <button
            style={styles.optionBtn}
            disabled={loading || !draft?.formValues}
            onClick={startBankTransfer}
            type="button"
          >
            <div style={styles.optionIcon}>
              <Icons.Bank />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>تحويل بنكي مباشر</div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 2 }}>عبر تطبيقات (بنكك، فوري، أو أم درمان) ورفع الإشعار</div>
            </div>
          </button>

          <button
            style={styles.backBtn}
            disabled={loading}
            onClick={() => navigate("/apply", { replace: true })}
            type="button"
          >
            <Icons.ArrowBack />
            <span>الرجوع لتعديل بيانات الطلب</span>
          </button>
        </div>

        {loading && <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 16 }}>جاري تجهيز مسار الدفع...</p>}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: "16px", direction: "rtl", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  card: { width: "100%", maxWidth: "460px", background: "#ffffff", padding: "32px 24px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", textAlign: "center", boxSizing: "border-box" },
  title: { margin: "0 0 8px", fontSize: "1.4rem", color: "#0f172a", fontWeight: "800" },
  subtitle: { color: "#64748b", lineHeight: "1.6", fontSize: "0.92rem", margin: "0 0 24px" },
  actions: { display: "flex", flexDirection: "column", gap: "12px" },
  optionBtn: { display: "flex", alignItems: "center", gap: "14px", width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "all 0.15s ease", boxSizing: "border-box" },
  optionIcon: { width: "44px", height: "44px", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  backBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", background: "transparent", border: "none", color: "#64748b", padding: "10px", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer", marginTop: "8px" }
};