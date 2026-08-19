import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./UsersManagement.css";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="users-mgmt-page">
      <AdminSectionNav />
      <div className="users-mgmt-header">
        <div>
          <h1 className="users-mgmt-title">إدارة المستخدمين</h1>
          <p className="users-mgmt-subtitle">البحث والتحكم في حسابات المواطنين المسجلين في المنظومة.</p>
        </div>
        <div className="users-mgmt-search-wrap">
          <input
            className="users-mgmt-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(query); }}
            placeholder="ابحث بالاسم أو البريد أو الهاتف"
          />
          <button className="btn-search-users" onClick={() => load(query)}>بحث</button>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12, fontWeight: 600 }}>{error}</div>}

      <div className="users-mgmt-table-wrap">
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>جاري التحميل...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>لا توجد نتائج مطابقة.</div>
        ) : (
          <table className="users-mgmt-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>التوثيق</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>
                    <span style={{ color: user.isActive ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                      {user.isActive ? "نشط" : "معطل"}
                    </span>
                  </td>
                  <td>{user.isEmailVerified || user.isPhoneVerified ? "موثق" : "غير موثق"}</td>
                  <td>
                    <button className="btn-table-open" onClick={() => navigate(`/admin/users/${user.id}`)}>
                      فتح الحساب
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}