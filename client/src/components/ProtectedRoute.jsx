import React, { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { getStoredUser, clearStoredAuth } from "../services/api";

const ProtectedRoute = ({
  children,
  role,
  requiredPermission,
  desktopOnly = false
}) => {
  const token = localStorage.getItem("token");
  const user = getStoredUser();
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 992 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 992);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. فحص وجود جلسة تسجيل الدخول
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. التحقق من مطابقة الدور (Role)
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role)) {
      const fallback =
        user.role === "admin" || user.role === "superadmin"
          ? "/admin"
          : user.role === "staff"
          ? "/staff"
          : "/";
      return <Navigate to={fallback} replace />;
    }
  }

  // 3. التحقق من امتلاك الصلاحية المطلوبة (Permissions) للموظفين
  if (requiredPermission && user.role !== "admin" && user.role !== "superadmin") {
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (!userPermissions.includes(requiredPermission)) {
      return (
        <div style={styles.wrapper}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>⚠️</div>
            <h2 style={styles.title}>صلاحية غير كافية</h2>
            <p style={styles.text}>
              ليس لديك الصلاحية المطلوبة للوصول إلى هذا القسم. يرجى مراجعة إدارة النظام.
            </p>
            <Link to="/staff" style={styles.button}>
              العودة للوحة الطلبات
            </Link>
          </div>
        </div>
      );
    }
  }

  // 4. تقييد الدخول للأجهزة المكتبية للموظفين والإدارة
  if (desktopOnly && isSmallScreen) {
    const isPrivileged = ["admin", "superadmin", "staff"].includes(user.role);

    if (isPrivileged) {
      return (
        <div style={styles.wrapper}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <h2 style={styles.title}>هذه اللوحة متاحة فقط من أجهزة الحاسوب</h2>
            <p style={styles.text}>
              لضمان دقة تدقيق ومراجعة المستندات الرسمية، تم تقييد لوحات الإدارة والموظفين لتعمل حصرياً على الشاشات الكبيرة وأجهزة الحاسوب المكتبية.
            </p>
            <div style={styles.actions}>
              <button
                onClick={() => {
                  clearStoredAuth();
                  window.location.href = "/login";
                }}
                style={styles.outlineButton}
              >
                تسجيل الخروج
              </button>
              <Link to="/" style={styles.button}>
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
};

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
    padding: 20,
    direction: "rtl",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "32px 24px",
    textAlign: "center",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)"
  },
  iconWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 16,
    fontSize: 40
  },
  title: {
    fontSize: "1.3rem",
    marginBottom: 12,
    color: "#0f172a",
    fontWeight: 700
  },
  text: {
    fontSize: "0.95rem",
    color: "#64748b",
    lineHeight: 1.7,
    marginBottom: 24
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap"
  },
  button: {
    display: "inline-block",
    backgroundColor: "#0284c7",
    color: "#ffffff",
    padding: "10px 20px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.92rem"
  },
  outlineButton: {
    backgroundColor: "transparent",
    color: "#dc2626",
    border: "1px solid #fecaca",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.92rem"
  }
};

export default ProtectedRoute;