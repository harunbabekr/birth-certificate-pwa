import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./UploadReceipt.css";

const Icons = {
  Upload: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
};

export default function UploadReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!file) {
      alert("يرجى اختيار ملف الإشعار");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      await api.postForm(`/requests/${id}/receipt`, formData);
      alert("تم رفع الإشعار بنجاح، بانتظار مراجعة موظف السجل.");
      navigate("/track");
    } catch (error) {
      alert(error.message || "فشل رفع الإشعار");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-receipt-page">
      <div className="upload-receipt-card">
        <h2 className="upload-receipt-title">إرفاق إشعار التحويل</h2>
        <p className="upload-receipt-subtitle">
          ارفع صورة أو ملف PDF لإشعار المعاملة البنكية لتأكيد الدفع.
        </p>

        <input
          type="file"
          accept="image/*,application/pdf"
          className="upload-receipt-input"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button className="upload-receipt-btn" onClick={submit} disabled={loading}>
          <Icons.Upload />
          <span>{loading ? "جاري الرفع..." : "تأكيد ورفع الإشعار"}</span>
        </button>
      </div>
    </div>
  );
}