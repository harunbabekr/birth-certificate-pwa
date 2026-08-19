import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PaymentSuccess.css";

const Icons = {
  CheckCircle: () => (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
};

function getFallbackState() {
  try {
    return JSON.parse(localStorage.getItem("lastSubmittedRequest") || "null");
  } catch {
    return null;
  }
}

export default function PaymentSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const current = useMemo(() => state || getFallbackState(), [state]);

  const requestNumber = current?.requestNumber || "—";
  const paymentMethod = current?.paymentMethod || "unknown";
  const isBankTransfer = paymentMethod === "bank_transfer";

  return (
    <div className="success-page-wrap">
      <div className="success-card">
        <div className="success-icon-badge">
          <Icons.CheckCircle />
        </div>

        <h2 className="success-title">تم حفظ وتأكيد الطلب بنجاح</h2>
        
        <p className="success-label">الرقم المرجعي للمعاملة</p>
        <h1 className="success-request-number">{requestNumber}</h1>

        <p className="success-desc">
          {isBankTransfer
            ? "تم إرسال إشعار التحويل البنكي للمراجعة والتدقيق المالي من قبل موظف السجل."
            : "تم تسجيل المعاملة بنجاح، يمكنك الآن متابعة مراحل إصدار الشهادة مباشرة."}
        </p>

        <div className="success-actions">
          <button className="btn-success-primary" onClick={() => navigate("/track")}>
            <Icons.Search />
            <span>متابعة حالة الطلب</span>
          </button>
          <button className="btn-success-outline" onClick={() => navigate("/")}>
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}