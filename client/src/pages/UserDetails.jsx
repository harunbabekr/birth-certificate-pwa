import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./UserDetails.css";

const Icons = {
  Save: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
};

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/users/${id}`);
      setUser(data.user);
    } catch (err) {
      setError(err.message || "تعذر تحميل المستخدم");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setError("");
    setFeedback("");
    try {
      const res = await api.put(`/admin/users/${id}`, {
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        unlockAccount: true,
        password: password || undefined
      });
      setUser(res.user);
      setPassword("");
      setFeedback("تم حفظ التعديلات وفك القفل إن وجد.");
    } catch (err) {
      setError(err.message || "تعذر حفظ التعديلات");
    }
  };

  if (loading) return <div className="user-details-page"><p style={{ textAlign: "center", color: "#64748b" }}>جاري التحميل...</p></div>;

  return (
    <div className="user-details-page">
      <AdminSectionNav />
      {error && <div className="user-details-error">{error}</div>}
      {feedback && <div className="user-details-success">{feedback}</div>}

      {!user ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>المستخدم غير موجود</div>
      ) : (
        <div className="user-details-card">
          <h1 className="user-details-title">تفاصيل حساب المستخدم</h1>
          
          <div className="user-details-grid">
            <div><strong>الاسم:</strong> {user.name}</div>
            <div><strong>البريد:</strong> {user.email || "-"}</div>
            <div><strong>الهاتف:</strong> {user.phone || "-"}</div>
            <div><strong>آخر دخول:</strong> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ar-EG") : "-"}</div>
            <div><strong>القفل المؤقت:</strong> {user.lockUntil ? new Date(user.lockUntil).toLocaleString("ar-EG") : "لا يوجد"}</div>
          </div>

          <div className="user-details-controls">
            <label className="user-details-switch">
              <input
                type="checkbox"
                checked={user.isActive}
                onChange={(e) => setUser({ ...user, isActive: e.target.checked })}
              />
              <span>الحساب نشط</span>
            </label>

            <label className="user-details-switch">
              <input
                type="checkbox"
                checked={user.isEmailVerified}
                onChange={(e) => setUser({ ...user, isEmailVerified: e.target.checked })}
              />
              <span>البريد موثق</span>
            </label>

            <label className="user-details-switch">
              <input
                type="checkbox"
                checked={user.isPhoneVerified}
                onChange={(e) => setUser({ ...user, isPhoneVerified: e.target.checked })}
              />
              <span>الهاتف موثق</span>
            </label>
          </div>

          <input
            className="user-details-input"
            type="password"
            placeholder="كلمة مرور جديدة (اختيارية)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn-user-save" onClick={save}>
            <Icons.Save />
            <span>حفظ التعديلات وفك القفل</span>
          </button>
        </div>
      )}
    </div>
  );
}