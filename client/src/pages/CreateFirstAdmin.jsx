import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setStoredAuth } from "../services/api";

export default function CreateFirstAdmin() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", setupKey: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    api.get("/auth/bootstrap-status")
      .then((res) => {
        if (!active) return;
        setAdminExists(Boolean(res.adminExists));
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "تعذر التحقق من حالة المدير الأول");
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/create-first-admin", {
        name: form.name,
        email: form.email,
        password: form.password,
        setupKey: form.setupKey
      });

      setStoredAuth(res.token, res.user);
      setSuccess(res.message || "تم إنشاء حساب المدير بنجاح.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "فشل إنشاء حساب المدير");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.page}>
        <p style={{ color: "#64748b" }}>جاري التحقق من إعدادات النظام...</p>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>تم إعداد المدير مسبقاً</h2>
          <p style={styles.subtitle}>يوجد حساب مدير مسجل بالفعل. يرجى المتابعة من صفحة تسجيل الدخول المعتادة.</p>
          <Link to="/login" style={styles.primaryLink}>الانتقال إلى تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={submit}>
        <h2 style={styles.title}>تهيئة المدير العام للنظام</h2>
        <p style={styles.subtitle}>تُستخدم هذه الواجهة لمرة واحدة فقط لإنشاء حساب المدير الرئيسي عبر مفتاح الإعداد السري.</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <input style={styles.input} placeholder="اسم المدير الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={styles.input} type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input style={styles.input} type="password" placeholder="كلمة المرور (6 خانات كحد أدنى)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input style={styles.input} type="password" placeholder="تأكيد كلمة المرور" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
        <input style={styles.input} placeholder="مفتاح الإعداد (ADMIN_SETUP_KEY)" value={form.setupKey} onChange={(e) => setForm({ ...form, setupKey: e.target.value })} required />

        <button style={styles.primaryBtn} disabled={loading}>{loading ? "جاري الحفظ..." : "إنشاء وتفعيل الحساب"}</button>
        <div style={styles.footer}><Link to="/login" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>العودة لتسجيل الدخول</Link></div>
      </form>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: "16px", direction: "rtl", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  card: { width: "100%", maxWidth: "440px", background: "#ffffff", padding: "28px 24px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", boxSizing: "border-box" },
  title: { margin: "0 0 8px", fontSize: "1.4rem", color: "#0f172a", fontWeight: "800" },
  subtitle: { color: "#64748b", lineHeight: "1.6", fontSize: "0.9rem", margin: "0 0 20px" },
  input: { width: "100%", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "11px 13px", fontSize: "0.92rem", marginBottom: "12px", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  primaryBtn: { width: "100%", border: 0, background: "#0284c7", color: "#ffffff", borderRadius: "8px", padding: "12px", fontSize: "0.95rem", fontWeight: "700", cursor: "pointer", transition: "background 0.15s ease" },
  primaryLink: { display: "inline-block", textDecoration: "none", background: "#0284c7", color: "#ffffff", borderRadius: "8px", padding: "10px 20px", fontWeight: "700", fontSize: "0.92rem" },
  error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.88rem", fontWeight: "600" },
  success: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.88rem", fontWeight: "600" },
  footer: { marginTop: "16px", textAlign: "center" }
};