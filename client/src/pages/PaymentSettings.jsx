import { useEffect, useState } from "react";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";
import "./PaymentSettings.css";

const Icons = {
  Bank: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

const emptyAccount = {
  id: "",
  label: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  isActive: true
};

export default function PaymentSettings() {
  const [instructions, setInstructions] = useState("");
  const [fixedAmount, setFixedAmount] = useState("5000");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/payment-info");
      setInstructions(data?.instructions || "");
      setFixedAmount(String(data?.fixedAmount || 0));
      setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
    } catch (err) {
      setError(err.message || "تعذر تحميل إعدادات الدفع البنكي");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const addAccount = () => {
    setAccounts((prev) => [
      ...prev,
      {
        ...emptyAccount,
        id: `bank_${Date.now()}`
      }
    ]);
  };

  const updateAccount = (index, key, value) => {
    setAccounts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const removeAccount = (index) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await api.put("/admin/payment-info", {
        instructions,
        fixedAmount: Number(fixedAmount),
        accounts
      });

      setFeedback("تم حفظ إعدادات الدفع البنكي بنجاح.");
      await loadSettings();
    } catch (err) {
      setError(err.message || "فشل حفظ إعدادات الدفع البنكي");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payment-settings-page">
      <AdminSectionNav />

      <header className="payment-settings-hero">
        <h1>إعدادات الدفع البنكي</h1>
        <p>إدارة رسوم الخدمة، الحسابات البنكية المعتمدة، وتعليمات التحويل للمواطنين.</p>
      </header>

      {error && <div className="ps-alert-error">{error}</div>}
      {feedback && <div className="ps-alert-success">{feedback}</div>}

      {loading ? (
        <div className="ps-card" style={{ textAlign: "center", color: "#64748b" }}>
          جاري تحميل الإعدادات...
        </div>
      ) : (
        <>
          <div className="ps-card">
            <div className="ps-card-header">
              <div className="ps-card-icon"><Icons.CreditCard /></div>
              <h3 className="ps-card-title">قيمة الرسوم الثابتة (جنيه سوداني)</h3>
            </div>
            <input
              className="ps-input"
              type="number"
              min="1"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="مثال: 5000"
            />
          </div>

          <div className="ps-card">
            <div className="ps-card-header">
              <div className="ps-card-icon"><Icons.FileText /></div>
              <h3 className="ps-card-title">تعليمات السداد والتحويل</h3>
            </div>
            <textarea
              className="ps-textarea"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="اكتب التوجيهات التي تظهر للمواطن أثناء اختيار الدفع البنكي"
            />
          </div>

          <div className="ps-card">
            <div className="ps-accounts-header">
              <div className="ps-card-header" style={{ margin: 0 }}>
                <div className="ps-card-icon"><Icons.Bank /></div>
                <h3 className="ps-card-title">الحسابات البنكية المعتمدة ({accounts.length})</h3>
              </div>

              <button type="button" className="btn-ps-add" onClick={addAccount}>
                <Icons.Plus />
                <span>إضافة بنك جديد</span>
              </button>
            </div>

            {accounts.length === 0 && (
              <p style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem 0" }}>
                لا توجد حسابات بنكية مضافة بعد.
              </p>
            )}

            {accounts.map((account, index) => (
              <div key={account.id || index} className="ps-account-box">
                <div className="ps-account-grid">
                  <div className="ps-field">
                    <label>المعرف الداخلي</label>
                    <input
                      className="ps-input"
                      value={account.id}
                      onChange={(e) => updateAccount(index, "id", e.target.value)}
                      placeholder="مثال: bok_senar"
                    />
                  </div>

                  <div className="ps-field">
                    <label>الاسم المعروض للمواطن</label>
                    <input
                      className="ps-input"
                      value={account.label}
                      onChange={(e) => updateAccount(index, "label", e.target.value)}
                      placeholder="مثال: بنك الخرطوم (mBOK)"
                    />
                  </div>

                  <div className="ps-field">
                    <label>اسم البنك الرسمي</label>
                    <input
                      className="ps-input"
                      value={account.bankName}
                      onChange={(e) => updateAccount(index, "bankName", e.target.value)}
                      placeholder="مثال: Bank of Khartoum"
                    />
                  </div>

                  <div className="ps-field">
                    <label>اسم صاحب الحساب</label>
                    <input
                      className="ps-input"
                      value={account.accountName}
                      onChange={(e) => updateAccount(index, "accountName", e.target.value)}
                      placeholder="مثال: السجل المدني"
                    />
                  </div>

                  <div className="ps-field">
                    <label>رقم الحساب</label>
                    <input
                      className="ps-input"
                      style={{ direction: "ltr" }}
                      value={account.accountNumber}
                      onChange={(e) => updateAccount(index, "accountNumber", e.target.value)}
                      placeholder="1234567"
                    />
                  </div>
                </div>

                <div className="ps-account-actions">
                  <label className="ps-switch-label">
                    <input
                      type="checkbox"
                      checked={account.isActive !== false}
                      onChange={(e) => updateAccount(index, "isActive", e.target.checked)}
                    />
                    <span>حساب نشط ومتاح للمستخدمين</span>
                  </label>

                  <button
                    type="button"
                    className="btn-ps-delete"
                    onClick={() => removeAccount(index)}
                  >
                    <Icons.Trash />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn-ps-save"
              onClick={saveSettings}
              disabled={saving}
            >
              <Icons.Save />
              <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}