import { Link } from "react-router-dom";
import { getStoredUser } from "../services/api";
import "./Welcome.css";

const Welcome = () => {
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  const renderActions = () => {
    if (!token) {
      return (
        <>
          <Link to="/login" className="btn btn-primary">تسجيل الدخول</Link>
          <Link to="/register" className="btn btn-outline">إنشاء حساب جديد</Link>
        </>
      );
    }

    switch (user?.role) {
      case "admin":
        return (
          <>
            <Link to="/admin" className="btn btn-primary">لوحة المدير</Link>
            <Link to="/staff" className="btn btn-outline">إدارة الطلبات</Link>
          </>
        );
      case "staff":
        return (
          <Link to="/staff" className="btn btn-primary">لوحة الموظف</Link>
        );
      default:
        return (
          <>
            <Link to="/apply" className="btn btn-primary">تقديم طلب جديد</Link>
            <Link to="/track" className="btn btn-outline">متابعة طلب سابق</Link>
          </>
        );
    }
  };

  return (
    <div className="welcome-page" dir="rtl">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="badge">الخدمات الإلكترونية الرسمية</span>
          <h1 className="hero-title">
            السجل المدني <span>—  خدمة طلب استخراج شهادة ميلاد</span>
          </h1>
          <p className="hero-subtitle">
            منظومة رقمية متكاملة لتقديم الطلبات،و الدفع الإلكتروني، ومتابعة المعاملات خطوة بخطوة بكل سهولة وأمان.
          </p>

          <div className="hero-actions">
            {renderActions()}
          </div>
        </div>

        {/* Features / Workflow Cards */}
        <div className="hero-features">
          <div className="features-grid">
            <div className="feature-item">
              <div className="icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h3>تقديم الطلب</h3>
              <p>أدخل بيانات المولود والمستندات المطلوبة بدقائق معدودة.</p>
            </div>

            <div className="feature-item">
              <div className="icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h3>طرق دفع متعددة</h3>
              <p>سداد عبر البطاقات، المحافظ، التحويل البنكي، أو نقدًا بالسجل.</p>
            </div>

            <div className="feature-item">
              <div className="icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>المتابعة اللحظية</h3>
              <p>تتبع مراحل التدقيق حتى استلام الشهادة عبر رقم الطلب.</p>
            </div>

            <div className="feature-item">
              <div className="icon-wrapper highlight">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l22 22" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                  <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </div>
              <h3>العمل دون اتصال</h3>
              <p>حفظ المعاملات وإشعارات التحويل محليًا ومزامنتها تلقائيًا عند عودة الاتصال.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="requirements-section">
        <div className="section-header">
          <h2 className="section-title">المتطلبات الأساسية لتقديم الطلب</h2>
          <p className="section-subtitle">تأكد من توفر البيانات والمستندات الآتية لتسريع إجراءات الاستخراج</p>
        </div>

        <div className="requirements-grid">
          <div className="req-card">
            <span className="step-num">01</span>
            <h3>بيانات المولود</h3>
            <p>الاسم الكامل، تاريخ الميلاد باليوم والشهر والسنة، والنوع ومكان الولادة.</p>
          </div>

          <div className="req-card">
            <span className="step-num">02</span>
            <h3>المستندات الثبوتية</h3>
            <p>نسخة ضوئية من هوية الأب، هوية الأم، وقسيمة الزواج المعتمدة.</p>
          </div>

          <div className="req-card">
            <span className="step-num">03</span>
            <h3>إتمام الرسوم والمتابعة</h3>
            <p>اختيار آلية السداد المناسبة ثم متابعة إشعار المعالجة عبر حسابك.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;