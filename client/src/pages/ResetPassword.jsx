import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ResetPassword.css";

const Icons = {
  Key: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 2-2 2m-1.5 1.5L14 9l-2-2-4 4-2-2-4 4 3.5 3.5 3-3"/>
      <circle cx="15.5" cy="8.5" r="2.5"/>
    </svg>
  )
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/forgot-password", { identifier });

      const finalIdentifier = res.identifier || identifier;
      localStorage.setItem("reset_identifier", finalIdentifier);
      localStorage.setItem("reset_channel", res.channel || "");

      navigate("/reset-password-otp", {
        state: {
          identifier: finalIdentifier,
          channel: res.channel,
          message:
            res.message ||
            (res.channel === "phone"
              ? "تم إرسال رمز إعادة التعيين إلى هاتفك."
              : "تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني.")
        }
      });
    } catch (err) {
      setError(err.message || "تعذر إرسال رمز إعادة التعيين");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-pwd-page">
      <form className="reset-pwd-card" onSubmit={submit}>
        <h2 className="reset-pwd-title">استعادة كلمة المرور</h2>
        <p className="reset-pwd-subtitle">
          أدخل بريدك الإلكتروني أو رقم هاتفك لإرسال رمز التحقق وإعادة التعيين.
        </p>

        {error && <div className="reset-pwd-error">{error}</div>}

        <input
          className="reset-pwd-input"
          placeholder="البريد الإلكتروني أو +249..."
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <button className="reset-pwd-btn" disabled={loading}>
          <Icons.Key />
          <span>{loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}</span>
        </button>

        <div className="reset-pwd-footer">
          <Link to="/login">العودة لتسجيل الدخول</Link>
        </div>
      </form>
    </div>
  );
}