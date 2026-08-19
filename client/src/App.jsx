import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import ApplyRequest from "./pages/ApplyRequest";
import BankTransfer from "./pages/BankTransfer";
import CreateFirstAdmin from "./pages/CreateFirstAdmin";
import Login from "./pages/Login";
import Payment from "./pages/Payment";
import PaymentSettings from "./pages/PaymentSettings";
import BankAccountsManagement from "./pages/BankAccountsManagement";
import PaymentSuccess from "./pages/PaymentSuccess";
import PermissionsManagement from "./pages/PermissionsManagement";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordOtp from "./pages/ResetPasswordOtp";
import StaffDashboard from "./pages/StaffDashboard";
import StaffManagement from "./pages/StaffManagement";
import TrackRequest from "./pages/TrackRequest";
import UploadReceipt from "./pages/UploadReceipt";
import UserDetails from "./pages/UserDetails";
import UsersManagement from "./pages/UsersManagement";
import VerifyAccount from "./pages/VerifyAccount";
import Welcome from "./pages/Welcome";
import { syncOfflineRequests } from "./services/indexedDB";
import { syncPendingUserReceipts } from "./services/userReceiptsDB";
import "./App.css";

const Icons = {
  WifiOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  )
};

function OfflineBanner({ online }) {
  if (online) return null;

  return (
    <div className="offline-banner" role="alert">
      <Icons.WifiOff />
      <span>أنت الآن في وضع عدم الاتصال. يتم حفظ التعديلات والطلبات محلياً وسيتم إرسالها تلقائياً عند عودة الشبكة.</span>
    </div>
  );
}

function App() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);

      try {
        const syncedRequests = await syncOfflineRequests();
        const syncedReceipts = await syncPendingUserReceipts();

        if (Array.isArray(syncedRequests) && syncedRequests.length > 0) {
          console.log("📡 تمت مزامنة الطلبات المحفوظة محلياً:", syncedRequests);
        }

        if (syncedReceipts) {
          console.log("📎 تمت مزامنة إشعارات التحويل البنكي.");
        }
      } catch (err) {
        console.error("خطأ أثناء المزامنة التلقائية:", err);
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      <OfflineBanner online={online} />
      <Navbar />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-account" element={<VerifyAccount />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password-otp" element={<ResetPasswordOtp />} />
        <Route path="/setup-admin" element={<CreateFirstAdmin />} />

        {/* مسارات المواطنين / المستخدمين */}
        <Route
          path="/apply"
          element={
            <ProtectedRoute role="user">
              <ApplyRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute role="user">
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute role="user">
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track"
          element={
            <ProtectedRoute role="user">
              <TrackRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank-transfer"
          element={
            <ProtectedRoute role="user">
              <BankTransfer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload-receipt/:id"
          element={
            <ProtectedRoute role="user">
              <UploadReceipt />
            </ProtectedRoute>
          }
        />

        {/* مسار موظفي السجل */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute role={["staff", "admin"]} desktopOnly>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* مسارات لوحة المدير العام */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff-permissions"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <PermissionsManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <UsersManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <UserDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payment-settings"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <PaymentSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bank-accounts"
          element={
            <ProtectedRoute role="admin" desktopOnly>
              <BankAccountsManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;