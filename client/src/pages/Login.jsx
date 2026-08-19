import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { setStoredAuth } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(location.state?.message || "");
  const [canSetupAdmin, setCanSetupAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    api.get("/auth/bootstrap-status")
      .then((res) => {
        if (!active) return;
        setCanSetupAdmin(!res.adminExists);
      })
      .catch(() => {
        if (!active) return;
        setCanSetupAdmin(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { identifier, password });
      setStoredAuth(res.token, res.user);
      navigate(res.user.role === "admin" ? "/admin" : res.user.role === "staff" ? "/staff" : "/", { replace: true });
    } catch (err) {
      const message = err.message || "فشل تسجيل الدخول";
      setError(message);
      if (message.includes("غير موثق") || message.includes("غير مفعل")) {
        setInfo("يمكنك الانتقال إلى صفحة تفعيل الحساب لإدخال رمز التحقق.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h2 style={styles.title}>تسجيل الدخول</h2>
        <p style={styles.subtitle}>أدخل بريدك الإلكتروني أو رقم هاتفك وكلمة المرور للمتابعة.</p>

        {canSetupAdmin && (
          <div style={styles.info}>
            لم يتم إعداد مدير للنظام بعد. <Link to="/setup-admin" style={{ color: "#0284c7", fontWeight: 700 }}>إعداد أول مدير</Link>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}
        {info && <div style={styles.info}>{info}</div>}

        <input
          style={styles.input}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="البريد الإلكتروني أو رقم الهاتف (+249...)"
          required
        />
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          required
        />
        <button style={styles.primaryBtn} disabled={loading}>
          {loading ? "جاري التحقق..." : "دخول"}
        </button>

        <div style={styles.links}>
          <Link to="/reset-password" style={styles.linkItem}>نسيت كلمة المرور؟</Link>
          <span style={{ color: "#cbd5e1" }}>•</span>
          <Link to="/register" style={styles.linkItem}>إنشاء حساب جديد</Link>
          <span style={{ color: "#cbd5e1" }}>•</span>
          <Link to="/verify-account" style={styles.linkItem}>تفعيل الحساب</Link>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: "16px", direction: "rtl", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  card: { width: "100%", maxWidth: "420px", background: "#ffffff", padding: "28px 24px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", boxSizing: "border-box" },
  title: { margin: "0 0 8px", fontSize: "1.4rem", color: "#0f172a", fontWeight: "800" },
  subtitle: { color: "#64748b", lineHeight: "1.6", fontSize: "0.9rem", margin: "0 0 20px" },
  error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.88rem", fontWeight: "600" },
  info: { background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.88rem" },
  input: { width: "100%", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "11px 13px", fontSize: "0.92rem", marginBottom: "12px", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  primaryBtn: { width: "100%", border: 0, background: "#0284c7", color: "#ffffff", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: "700", cursor: "pointer", transition: "background 0.15s ease" },
  links: { marginTop: "18px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" },
  linkItem: { color: "#0284c7", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }
};