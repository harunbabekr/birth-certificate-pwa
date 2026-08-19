import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ResetPasswordOtp.css";

const Icons = {
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
};

export default function ResetPasswordOtp() {
  const location = useLocation();
  const navigate = useNavigate();

  const storedIdentifier = localStorage.getItem("reset_identifier") || "";
  const storedChannel = localStorage.getItem("reset_channel") || "";

  const fixedIdentifier = useMemo(
    () => location.state?.identifier || storedIdentifier || "",
    [location.state?.identifier, storedIdentifier]
  );

  const fixedChannel = useMemo(
    () => location.state?.channel || storedChannel || "",
    [location.state?.channel, storedChannel]
  );

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info] = useState(location.state?.message || "");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!fixedIdentifier) {
      setError("المعرف مفقود. أعد طلب رمز إعادة التعيين.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/reset-password", {
        identifier: fixedIdentifier,
        code,
        newPassword
      });

      localStorage.removeItem("reset_identifier");
      localStorage.removeItem("reset_channel");

      navigate("/login", {
        state: {
          message: "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول."
        }
      });
    } catch (err) {
      setError(err.message || "فشل حفظ كلمة المرور الجديدة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-otp-page">
      <form className="reset-otp-card" onSubmit={submit}>
        <h2 className="reset-otp-title">تأكيد كلمة المرور الجديدة</h2>

        {info && <div className="reset-otp-info">{info}</div>}

        {fixedChannel && (
          <div className="reset-otp-hint">
            {fixedChannel === "phone"
              ? "أدخل الرمز الذي وصلك عبر الرسالة النصية SMS."
              : "أدخل الرمز الذي وصلك عبر البريد الإلكتروني."}
          </div>
        )}

        {error && <div className="reset-otp-error">{error}</div>}

        <input
          className="reset-otp-input reset-otp-readonly"
          value={fixedIdentifier}
          readOnly
        />

        <input
          className="reset-otp-input"
          placeholder="رمز التحقق (OTP)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <input
          className="reset-otp-input"
          type="password"
          placeholder="كلمة المرور الجديدة"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <input
          className="reset-otp-input"
          type="password"
          placeholder="تأكيد كلمة المرور الجديدة"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button className="reset-otp-btn" disabled={loading}>
          <Icons.Check />
          <span>{loading ? "جاري الحفظ..." : "حفظ وتفعيل كلمة المرور"}</span>
        </button>
      </form>
    </div>
  );
}