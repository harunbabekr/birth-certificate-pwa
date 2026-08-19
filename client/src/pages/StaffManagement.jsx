import { useEffect, useMemo, useState } from "react";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./StaffManagement.css";

const Icons = {
  UserPlus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  Save: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
};

const emptyForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  permissions: [],
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: true
};

export default function StaffManagement() {
  const [permissions, setPermissions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const editing = useMemo(() => Boolean(form.id), [form.id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/staff");
      setStaff(data.users || []);
      setPermissions(data.permissions || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الموظفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setFeedback("");
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((item) => item !== key)
        : [...prev.permissions, key]
    }));
  };

  const startEdit = (user) => {
    setForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: Boolean(user.isActive),
      isEmailVerified: Boolean(user.isEmailVerified),
      isPhoneVerified: Boolean(user.isPhoneVerified)
    });
    setFeedback("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUnlockAccount = async (userId) => {
    try {
      setError("");
      setFeedback("");
      await api.put(`/admin/staff/${userId}`, {
        unlockAccount: true
      });
      setFeedback("تم فك قفل حساب الموظف بنجاح.");
      await load();
    } catch (err) {
      setError(err.message || "فشل فك قفل حساب الموظف");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setFeedback("");

    if (!form.email && !form.phone) {
      setError("أدخل بريدًا إلكترونيًا أو رقم هاتف على الأقل.");
      setSaving(false);
      return;
    }

    if (!editing && form.password.length < 6) {
      setError("كلمة المرور الأولى يجب أن تكون 6 أحرف على الأقل.");
      setSaving(false);
      return;
    }

    try {
      const cleanedEmail = String(form.email || "").trim();
      const cleanedPhone = String(form.phone || "").trim();

      const payload = {
        name: String(form.name || "").trim(),
        email: cleanedEmail || undefined,
        phone: cleanedPhone || undefined,
        password: form.password || undefined,
        permissions: form.permissions,
        isActive: form.isActive,
        isEmailVerified: cleanedEmail ? form.isEmailVerified : false,
        isPhoneVerified: cleanedPhone ? form.isPhoneVerified : false
      };

      if (editing) {
        const res = await api.put(`/admin/staff/${form.id}`, payload);
        setStaff((prev) => prev.map((item) => (item.id === form.id ? res.user : item)));
        setFeedback("تم تحديث الموظف بنجاح.");
      } else {
        const res = await api.post("/admin/staff", payload);
        setStaff((prev) => [res.user, ...prev]);
        setFeedback("تمت إضافة الموظف.");
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "فشل حفظ بيانات الموظف");
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (user) => {
    const confirmed = window.confirm(`هل تريد حذف الموظف ${user.name}؟`);
    if (!confirmed) return;

    try {
      await api.delete(`/admin/staff/${user.id}`);
      setStaff((prev) => prev.filter((item) => item.id !== user.id));
      if (form.id === user.id) resetForm();
      setFeedback("تم حذف الموظف.");
    } catch (err) {
      setError(err.message || "فشل حذف الموظف");
    }
  };

  return (
    <div className="staff-page">
      <AdminSectionNav />
      <div className="staff-header-wrap">
        <h1 className="staff-title">إدارة الموظفين</h1>
        <p className="staff-subtitle">تعيين وإدارة بيانات موظفي السجل المدني وتحديد الصلاحيات.</p>
      </div>

      {error && <div className="staff-alert staff-alert-error">{error}</div>}
      {feedback && <div className="staff-alert staff-alert-success">{feedback}</div>}

      <div className="staff-layout">
        <form className="staff-card" onSubmit={submit} autoComplete="off">
          <h2 className="staff-section-title">
            {editing ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
          </h2>

          <input
            type="text"
            name="fake_username"
            autoComplete="username"
            tabIndex={-1}
            style={{ display: "none" }}
          />

          <input
            type="password"
            name="fake_password"
            autoComplete="new-password"
            tabIndex={-1}
            style={{ display: "none" }}
          />

          <input
            className="staff-input"
            name="staff_full_name"
            autoComplete="off"
            placeholder="اسم الموظف"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <input
            className="staff-input"
            type="email"
            name="staff_email_address"
            autoComplete="off"
            placeholder="البريد الإلكتروني"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            className="staff-input"
            type="tel"
            name="staff_phone_number_new"
            autoComplete="off"
            inputMode="tel"
            placeholder="رقم الهاتف +249..."
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            className="staff-input"
            type="password"
            name="staff_new_password"
            autoComplete="new-password"
            placeholder={editing ? "كلمة مرور جديدة (اختيارية)" : "كلمة المرور الأولى"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editing}
          />

          <div className="staff-switch-grid">
            <label className="staff-switch">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>الحساب نشط</span>
            </label>

            <label className="staff-switch">
              <input
                type="checkbox"
                checked={form.isEmailVerified}
                onChange={(e) => setForm({ ...form, isEmailVerified: e.target.checked })}
              />
              <span>البريد موثق</span>
            </label>

            <label className="staff-switch">
              <input
                type="checkbox"
                checked={form.isPhoneVerified}
                onChange={(e) => setForm({ ...form, isPhoneVerified: e.target.checked })}
              />
              <span>الهاتف موثق</span>
            </label>
          </div>

          <div className="staff-permissions-grid">
            {permissions
              .filter((p) => !["manage_staff", "manage_users"].includes(p.key))
              .map((p) => (
                <label key={p.key} className="staff-permission-item">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p.key)}
                    onChange={() => togglePermission(p.key)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
          </div>

          <div className="staff-actions-row">
            <button className="staff-btn staff-btn-primary" disabled={saving}>
              {editing ? <Icons.Save /> : <Icons.UserPlus />}
              <span>{saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة الموظف"}</span>
            </button>

            {editing && (
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={resetForm}
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        <div className="staff-card">
          <h2 className="staff-section-title">الموظفون الحاليون</h2>

          {loading ? (
            <div className="staff-small">جاري التحميل...</div>
          ) : staff.length === 0 ? (
            <div className="staff-empty">لا يوجد موظفون مسجلون حاليًا.</div>
          ) : (
            <div className="staff-list">
              {staff.map((item) => {
                const isLocked = Boolean(
                  item.lockUntil && new Date(item.lockUntil) > new Date()
                );

                return (
                  <div key={item.id} className="staff-list-item">
                    <div className="staff-item-header">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="staff-small">{item.email || item.phone || "-"}</div>
                      </div>

                      <span
                        className={
                          item.isActive
                            ? "staff-badge staff-badge-active"
                            : "staff-badge staff-badge-muted"
                        }
                      >
                        {item.isActive ? "نشط" : "معطل"}
                      </span>
                    </div>

                    <div className="staff-meta-grid">
                      <div className="staff-small">
                        عدد الصلاحيات: <strong>{item.permissions?.length || 0}</strong>
                      </div>

                      <div className="staff-small">
                        حالة القفل:{" "}
                        <span className={isLocked ? "staff-locked-text" : "staff-unlocked-text"}>
                          {isLocked ? "مقفول مؤقتًا" : "سليم"}
                        </span>
                      </div>
                    </div>

                    <div className="staff-item-actions">
                      <button
                        type="button"
                        className="staff-btn staff-btn-link"
                        onClick={() => startEdit(item)}
                      >
                        تعديل
                      </button>

                      {isLocked && (
                        <button
                          type="button"
                          className="staff-btn staff-btn-warning"
                          onClick={() => handleUnlockAccount(item.id)}
                        >
                          فك القفل
                        </button>
                      )}

                      <button
                        type="button"
                        className="staff-btn staff-btn-danger"
                        onClick={() => removeStaff(item)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}