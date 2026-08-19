import { useEffect, useState } from "react";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./PermissionsManagement.css";

const Icons = {
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
};

export default function PermissionsManagement() {
  const [permissions, setPermissions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/staff");
      setPermissions(data.permissions || []);
      setStaff(data.users || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (userId, key) => {
    setStaff((prev) => prev.map((item) => item.id === userId ? {
      ...item,
      permissions: item.permissions.includes(key)
        ? item.permissions.filter((p) => p !== key)
        : [...item.permissions, key]
    } : item));
  };

  const save = async (user) => {
    setSavingId(user.id);
    setError("");
    try {
      const res = await api.put(`/admin/staff/${user.id}`, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        permissions: user.permissions,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      });
      setStaff((prev) => prev.map((item) => item.id === user.id ? res.user : item));
    } catch (err) {
      setError(err.message || "تعذر حفظ الصلاحيات");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="permissions-page">
      <AdminSectionNav />
      
      <div className="permissions-header">
        <h1>إدارة صلاحيات الموظفين</h1>
        <p>تخصيص الصلاحيات التشغيلية والتدقيق المالي لكل موظف في النظام.</p>
      </div>

      {error && <div className="perm-alert-error">{error}</div>}

      {loading ? (
        <p style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>جاري تحميل الصلاحيات...</p>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>لا يوجد موظفون مضافون لإدارة صلاحياتهم.</div>
      ) : (
        <div className="permissions-grid">
          {staff.map((user) => (
            <div key={user.id} className="permissions-card">
              <div>
                <div className="permissions-card-top">
                  <div>
                    <h3 className="staff-name">{user.name}</h3>
                    <p className="staff-contact">{user.email || user.phone || "-"}</p>
                  </div>
                  <label className={`staff-status-badge ${user.isActive ? "staff-status-badge--active" : "staff-status-badge--disabled"}`}>
                    <input
                      type="checkbox"
                      style={{ display: "none" }}
                      checked={user.isActive}
                      onChange={(e) => setStaff((prev) => prev.map((item) => item.id === user.id ? { ...item, isActive: e.target.checked } : item))}
                    />
                    <span>{user.isActive ? "نشط" : "معطل"}</span>
                  </label>
                </div>

                <div className="perm-items-list">
                  {permissions.filter((p) => !["manage_staff", "manage_users", "manage_settings"].includes(p.key)).map((p) => (
                    <label key={p.key} className="perm-item-label">
                      <input
                        className="perm-checkbox"
                        type="checkbox"
                        checked={user.permissions.includes(p.key)}
                        onChange={() => toggle(user.id, p.key)}
                      />
                      <span className="perm-text">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="btn-save-perm" onClick={() => save(user)} disabled={savingId === user.id}>
                <Icons.Save />
                <span>{savingId === user.id ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}