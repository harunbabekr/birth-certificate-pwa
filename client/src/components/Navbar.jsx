import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearStoredAuth, getStoredUser } from "../services/api";
import "./Navbar.css";

const Icons = {
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Admin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Apply: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Track: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Login: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  Register: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  Logout: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Menu: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Close: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
};

export default function Navbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const dropdownRef = useRef(null);
  const token = localStorage.getItem("token");

  const user = useMemo(() => (token ? getStoredUser() : null), [token]);
  const isPrivileged = ["staff", "admin"].includes(user?.role);
  const hidePrivilegedNav = isPrivileged && isSmallScreen;

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 992);
      if (window.innerWidth >= 992) {
        setMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const closeMenus = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
  };

  const logout = () => {
    clearStoredAuth();
    closeMenus();
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar-container">
      <nav className="navbar" dir="rtl">
        <div className="nav-right">
          <Link to="/" className="brand" onClick={closeMenus}>
            <img 
              src="/icon-192.png" 
              alt="شعار السجل المدني" 
              className="brand-logo-img"
            />
            <div className="brand-info">
              <span className="brand-text">السجل المدني</span>
              <span className="brand-subtext">خدمة شهادات الميلاد</span>
            </div>
          </Link>
        </div>

        <button
          className="nav-burger"
          type="button"
          aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <Icons.Close /> : <Icons.Menu />}
        </button>

        <div className={`nav-left ${mobileOpen ? "open" : ""}`}>
          {!token && (
            <div className="nav-links">
              <Link className="nav-link" to="/login" onClick={closeMenus}>
                <Icons.Login />
                <span>تسجيل دخول</span>
              </Link>
              <Link className="nav-link nav-cta" to="/register" onClick={closeMenus}>
                <Icons.Register />
                <span>إنشاء حساب</span>
              </Link>
            </div>
          )}

          {token && user?.role === "user" && (
            <div className="nav-links">
              <div className="nav-user">
                <span className="nav-avatar">
                  <Icons.User />
                </span>
                <span className="nav-user-text">{user?.name || "مستخدم"}</span>
              </div>
              <Link className="nav-link" to="/apply" onClick={closeMenus}>
                <Icons.Apply />
                <span>تقديم طلب</span>
              </Link>
              <Link className="nav-link" to="/track" onClick={closeMenus}>
                <Icons.Track />
                <span>متابعة الطلب</span>
              </Link>
              <button className="nav-link nav-btn danger-hover" onClick={logout} type="button">
                <Icons.Logout />
                <span>خروج</span>
              </button>
            </div>
          )}

          {token && isPrivileged && (
            <div className="nav-links">
              {!hidePrivilegedNav ? (
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className={`nav-link dropdown-toggle ${dropdownOpen ? "active" : ""}`}
                    onClick={() => setDropdownOpen((v) => !v)}
                    type="button"
                  >
                    <span className="nav-avatar privileged">
                      <Icons.Admin />
                    </span>
                    <span className="nav-user-text">
                      {user?.name || (user?.role === "admin" ? "المدير العام" : "موظف السجل")}
                    </span>
                    <Icons.ChevronDown />
                  </button>

                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      {user?.role === "admin" && (
                        <Link className="dropdown-item" to="/admin" onClick={closeMenus}>
                          <Icons.Admin />
                          <span>لوحة المدير</span>
                        </Link>
                      )}
                      <Link className="dropdown-item" to="/staff" onClick={closeMenus}>
                        <Icons.Apply />
                        <span>لوحة معالجة الطلبات</span>
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button className="dropdown-item danger" onClick={logout} type="button">
                        <Icons.Logout />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button className="nav-link nav-btn danger-hover" onClick={logout} type="button">
                  <Icons.Logout />
                  <span>تسجيل الخروج</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}