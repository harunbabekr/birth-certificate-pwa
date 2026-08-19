import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { setStoredAuth } from "../services/api";
import "./VerifyAccount.css";

export default function VerifyAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialIdentifier = location.state?.identifier || "";
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(location.state?.message || "أدخل رمز التحقق الذي وصلك على البريد أو الهاتف.");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-register-otp", { identifier, code });
      setStoredAuth(res.token, res.user);
      navigate(res.user.role === "admin" ? "/admin" : res.user.role === "staff" ? "/staff" : "/", { replace: true });
    } catch (err) {
      setError(err.message || "فشل التحقق");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      const res = await api.post("/auth/resend-verification-otp", { identifier });
      setInfo(res.message || "تمت إعادة إرسال رمز التحقق");
    } catch (err) {
      setError(err.message || "تعذر إعادة الإرسال");
    }
  };

  return (
    <div className="verify-page">
      <form className="verify-card" onSubmit={submit}>
        <h2 className="verify-title">تفعيل الحساب</h2>
        <p className="verify-subtitle">أدخل رمز التحقق المكون من 6 أرقام لتأكيد الحساب والدخول.</p>
        
        {error && <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: "0.88rem", fontWeight: 600 }}>{error}</div>}
        {info && <div style={{ color: "#0284c7", marginBottom: 12, fontSize: "0.88rem" }}>{info}</div>}
        
        <input
          className="verify-input"
          placeholder="البريد أو الهاتف"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        
        <input
          className="verify-input"
          placeholder="رمز التحقق (OTP)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        
        <button className="verify-primary-btn" disabled={loading}>
          {loading ? "جاري التحقق..." : "تأكيد التفعيل"}
        </button>
        
        <button type="button" className="verify-secondary-btn" onClick={resend}>
          إعادة إرسال الرمز
        </button>
        
        <div className="verify-footer">
          <Link to="/login">العودة إلى تسجيل الدخول</Link>
        </div>
      </form>
    </div>
  );
}