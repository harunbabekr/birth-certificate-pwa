import React from "react";
import { NavLink } from "react-router-dom";

// أيقونات SVG نظيفة ومتناسقة مع واجهات النظم الإدارية
const Icons = {
  Home: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Staff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Bank: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
};

const items = [
  { to: "/admin", label: "الرئيسية", Icon: Icons.Home },
  { to: "/admin/staff", label: "الموظفون", Icon: Icons.Staff },
  { to: "/admin/staff-permissions", label: "الصلاحيات", Icon: Icons.Shield },
  { to: "/admin/users", label: "المستخدمون", Icon: Icons.Users },
  { to: "/admin/bank-accounts", label: "الحسابات البنكية", Icon: Icons.Bank },
  { to: "/admin/payment-settings", label: "إعدادات الدفع", Icon: Icons.Settings }
];

export default function AdminSectionNav() {
  return (
    <nav style={styles.wrap} aria-label="شريط تنقل الإدارة">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/admin"}
          style={({ isActive }) => ({
            ...styles.link,
            ...(isActive ? styles.active : styles.inactive)
          })}
        >
          <span style={styles.iconWrap}>
            <Icon />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

const styles = {
  wrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "24px",
    padding: "6px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0"
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "0.92rem",
    fontWeight: "600",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    userSelect: "none"
  },
  inactive: {
    color: "#475569",
    background: "transparent",
    border: "1px solid transparent"
  },
  active: {
    color: "#ffffff",
    backgroundColor: "#0284c7",
    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.28)",
    border: "1px solid #0284c7"
  },
  iconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};