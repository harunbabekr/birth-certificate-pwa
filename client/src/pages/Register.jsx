import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

const Icons = {
  Mail: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Phone: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
};

function normalizeSudanesePhone(value = "") {
  let phone = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (!phone) return "";
  if (phone.startsWith("249")) phone = `+${phone}`;
  if (/^\+249\d+$/.test(phone)) return phone;
  if (/^09\d{8}$/.test(phone) || /^01\d{8}$/.test(phone)) return `+249${phone.slice(1)}`;
  if (/^090\d{7}$/.test(phone) || /^010\d{7}$/.test(phone)) return `+249${phone.slice(1)}`;
  if (/^9\d{8}$/.test(phone) || /^1\d{8}$/.test(phone)) return `+249${phone}`;
  if (/^90\d{7}$/.test(phone) || /^10\d{7}$/.test(phone)) return `+249${phone}`;

  return phone;
}

function isSudanesePhone(value = "") {
  const phone = normalizeSudanesePhone(value);
  return /^\+249(9\d{8}|1\d{8}|90\d{7}|10\d{7})$/.test(phone);
}

export default function Register() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("email");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const setModeAndResetError = (nextMode) => {
    setMode(nextMode);
    setError("");
    setInfo("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (form.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    const normalizedPhone = normalizeSudanesePhone(form.phone);

    if (mode === "phone" && !isSudanesePhone(form.phone)) {
      setError("أدخل رقم هاتف سوداني صحيح (مثال: 09XXXXXXXX أو +249XXXXXXXXX).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        password: form.password,
        ...(mode === "email"
          ? { email: form.email.trim() }
          : { phone: normalizedPhone })
      };

      const res = await api.post("/auth/register", payload);

      navigate("/verify-account", {
        state: {
          identifier: res.identifier,
          channel: res.channel,
          message: res.message
        }
      });
    } catch (err) {
      setError(err.message || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={submit}>
        <h2 className="register-title">إنشاء حساب جديد</h2>
        <p className="register-subtitle">سجّل بياناتك لتقديم ومتابعة طلبات استخراج شهادات الميلاد.</p>

        {error && <div className="register-error">{error}</div>}
        {info && <div className="register-info">{info}</div>}

        <div className="register-tabs">
          <button
            type="button"
            className={`register-tab-btn ${mode === "email" ? "register-tab-btn--active" : ""}`}
            onClick={() => setModeAndResetError("email")}
          >
            <Icons.Mail />
            <span>عبر البريد</span>
          </button>
          <button
            type="button"
            className={`register-tab-btn ${mode === "phone" ? "register-tab-btn--active" : ""}`}
            onClick={() => setModeAndResetError("phone")}
          >
            <Icons.Phone />
            <span>عبر الهاتف</span>
          </button>
        </div>

        <input
          className="register-input"
          placeholder="الاسم الكامل"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        {mode === "email" ? (
          <input
            className="register-input"
            type="email"
            placeholder="البريد الإلكتروني (example@mail.com)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        ) : (
          <div>
            <input
              className="register-input"
              placeholder="09XXXXXXXX أو +249..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <div className="register-hint">صيغ مقبولة: 0912345678 أو +249912345678</div>
          </div>
        )}

        <input
          className="register-input"
          type="password"
          placeholder="كلمة المرور"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <input
          className="register-input"
          type="password"
          placeholder="تأكيد كلمة المرور"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        <button className="register-submit-btn" disabled={loading}>
          {loading ? "جاري الإرسال..." : "إنشاء الحساب"}
        </button>

        <div className="register-footer">
          <Link to="/login">لديك حساب بالفعل؟ تسجيل الدخول</Link>
        </div>
      </form>
    </div>
  );
}