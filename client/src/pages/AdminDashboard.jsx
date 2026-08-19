import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./AdminDashboard.css";

const Icons = {
  Users: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Staff: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  Shield: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Bank: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  )
};

const defaultStats = { users: 0, staff: 0, admins: 0, activeStaff: 0, disabledUsers: 0 };

export default function AdminDashboard() {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    api.get("/admin/summary")
      .then((data) => {
        if (!active) return;
        setStats({ ...defaultStats, ...(data?.stats || {}) });
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "تعذر تحميل ملخص الإدارة");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { title: "إدارة الموظفين", desc: "إضافة، تعديل، وتعيين بيانات الموظفين في المنظومة.", path: "/admin/staff", Icon: Icons.Staff },
    { title: "إدارة الصلاحيات", desc: "تخصيص أذونات العمل والتدقيق لكل موظف بحسب تخصصه.", path: "/admin/staff-permissions", Icon: Icons.Shield },
    { title: "إدارة المستخدمين", desc: "متابعة الحسابات، التحقق، فك القفل، وإدارة التفعيل.", path: "/admin/users", Icon: Icons.Users },
    { title: "إعدادات الدفع والحسابات", desc: "تحديد الرسوم المعتمدة، الحسابات البنكية، وتعليمات السداد.", path: "/admin/bank-accounts", Icon: Icons.Bank }
  ];

  const statCards = [
    { label: "إجمالي المستخدمين", value: stats.users, color: "#0284c7" },
    { label: "الموظفون المسجلون", value: stats.staff, color: "#0f766e" },
    { label: "الموظفون النشطون", value: stats.activeStaff, color: "#16a34a" },
    { label: "المديرون", value: stats.admins, color: "#4f46e5" },
    { label: "الحسابات المعطلة", value: stats.disabledUsers, color: "#dc2626" }
  ];

  return (
    <div className="admin-dashboard-page">
      <AdminSectionNav />

      <header className="admin-page-header">
        <div>
          <h1>لوحة الإدارة المركزية</h1>
          <p>التحكم الشامل في حسابات الموظفين، الصلاحيات، وإعدادات الدفع المالي.</p>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-stats-grid" aria-label="إحصائيات المنظومة">
        {statCards.map((item) => (
          <div key={item.label} className="admin-stat-card">
            <span className="admin-stat-number" style={{ color: item.color }}>
              {loading ? "..." : item.value}
            </span>
            <span className="admin-stat-label">{item.label}</span>
          </div>
        ))}
      </section>

      <section className="admin-sections-grid" aria-label="أقسام الإدارة">
        {cards.map((card) => {
          const CardIcon = card.Icon;
          return (
            <button
              key={card.path}
              type="button"
              className="admin-nav-card"
              onClick={() => navigate(card.path)}
            >
              <div className="admin-card-header">
                <div className="admin-card-icon">
                  <CardIcon />
                </div>
                <h3 className="admin-card-title">{card.title}</h3>
              </div>
              <p className="admin-card-desc">{card.desc}</p>
              <div className="admin-card-footer">
                <span>فتح القسم</span>
                <Icons.ArrowLeft />
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}