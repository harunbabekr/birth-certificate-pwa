import { useEffect, useState } from "react";
import AdminSectionNav from "../components/AdminSectionNav";
import api from "../services/api";

const BANK_OPTIONS = [
  { value: "khartoum", label: "بنك الخرطوم (mBOK)" },
  { value: "faisal",   label: "بنك فيصل الإسلامي (Fawry)" },
  { value: "omdurman", label: "بنك أم درمان الوطني (Omdurman Online)" },
  { value: "other",    label: "بنك آخر" }
];

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
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
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

const EMPTY = { id: "", bankName: "", accountName: "", accountNumber: "", label: "", isActive: true };

export default function BankAccountsManagement() {
  const [settings, setSettings] = useState({ fixedAmount: 0, instructions: "", accounts: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/admin/payment-info")
      .then((d) => setSettings({ fixedAmount: d?.fixedAmount || 0, instructions: d?.instructions || "", accounts: d?.accounts || [] }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError(""); setSaving(true);
    try {
      await api.put("/admin/payment-info", settings);
      setSuccess("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openAdd = () => { setEditIdx(null); setForm(EMPTY); setShowForm(true); };

  const openEdit = (i) => {
    setEditIdx(i);
    const acc = settings.accounts[i];
    const bankOpt = BANK_OPTIONS.find((o) => acc.bankName?.includes(o.label));
    setForm({ ...acc, _bankId: bankOpt?.value || "other" });
    setShowForm(true);
  };

  const saveAccount = () => {
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      setError("يرجى تعبئة اسم البنك واسم الحساب ورقمه"); return;
    }
    const acc = { id: form.id || `acc-${Date.now()}`, bankName: form.bankName, accountName: form.accountName, accountNumber: form.accountNumber, label: form.label || form.bankName, isActive: form.isActive !== false };
    const accounts = [...settings.accounts];
    if (editIdx !== null) accounts[editIdx] = acc;
    else accounts.push(acc);
    setSettings((s) => ({ ...s, accounts }));
    setShowForm(false);
  };

  const removeAccount = (i) => {
    const accounts = settings.accounts.filter((_, idx) => idx !== i);
    setSettings((s) => ({ ...s, accounts }));
  };

  const toggleAccount = (i) => {
    const accounts = [...settings.accounts];
    accounts[i] = { ...accounts[i], isActive: !accounts[i].isActive };
    setSettings((s) => ({ ...s, accounts }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", direction: "rtl", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <AdminSectionNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a", fontWeight: "800" }}>إعدادات الدفع والحسابات البنكية</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>إدارة رسوم استخراج الشهادات وحسابات التحويل المعتمدة</p>
          </div>
          <button onClick={save} disabled={saving} style={btnStyle("#0284c7")}>
            <Icons.Save />
            <span>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
          </button>
        </div>

        {error   && <div style={alertStyle("#fef2f2","#b91c1c","#fecaca")}>{error}</div>}
        {success && <div style={alertStyle("#f0fdf4","#15803d","#bbf7d0")}>{success}</div>}

        {loading ? (
          <p style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>جاري تحميل البيانات...</p>
        ) : (
          <>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", color: "#0f172a", fontWeight: "700" }}>الرسوم والتعليمات</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>رسوم الاستخراج (جنيه سوداني)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={settings.fixedAmount}
                    onChange={(e) => setSettings((s) => ({ ...s, fixedAmount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>تعليمات التحويل البنكي للمواطن</label>
                  <input
                    style={inputStyle}
                    value={settings.instructions}
                    onChange={(e) => setSettings((s) => ({ ...s, instructions: e.target.value }))}
                    placeholder="مثال: حوّل الرسوم واذكر رقم الطلب في الملاحظات"
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: "700" }}>
                  الحسابات المعتمدة ({settings.accounts.length})
                </h3>
                <button onClick={openAdd} style={btnStyle("#0f766e", "sm")}>
                  <Icons.Plus />
                  <span>إضافة حساب جديد</span>
                </button>
              </div>

              {showForm && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <h4 style={{ margin: "0 0 12px", color: "#0f172a" }}>{editIdx !== null ? "تعديل الحساب البنكي" : "إضافة حساب بنكي جديد"}</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>نوع البنك</label>
                      <select
                        style={inputStyle}
                        value={form._bankId || "other"}
                        onChange={(e) => {
                          const opt = BANK_OPTIONS.find((o) => o.value === e.target.value);
                          setForm((f) => ({ ...f, _bankId: e.target.value, bankName: opt?.label || f.bankName }));
                        }}
                      >
                        {BANK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>اسم البنك المعروض *</label>
                      <input style={inputStyle} value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>اسم الحساب الرسمي *</label>
                      <input style={inputStyle} value={form.accountName} placeholder="مثال: السجل المدني - ولاية سنار" onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>رقم الحساب *</label>
                      <input style={{ ...inputStyle, direction: "ltr" }} value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={btnStyle("#64748b", "sm")}>إلغاء</button>
                    <button onClick={saveAccount} style={btnStyle("#0284c7", "sm")}>حفظ الحساب</button>
                  </div>
                </div>
              )}

              {settings.accounts.length === 0 ? (
                <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>لا توجد حسابات بنكية مضافة حالياً.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {settings.accounts.map((acc, i) => (
                    <div
                      key={acc.id || i}
                      style={{
                        border: `1px solid ${acc.isActive ? "#e2e8f0" : "#fca5a5"}`,
                        borderRadius: 10,
                        padding: "14px 16px",
                        background: acc.isActive ? "#ffffff" : "#fff5f5",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ color: "#0284c7" }}>
                        <Icons.Bank />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {acc.bankName} {!acc.isActive && <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>(معطّل)</span>}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 2 }}>
                          {acc.accountName} · <span dir="ltr" style={{ fontWeight: 600 }}>{acc.accountNumber}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(i)} style={btnStyle("#64748b", "xs")}>تعديل</button>
                        <button onClick={() => toggleAccount(i)} style={btnStyle(acc.isActive ? "#d97706" : "#16a34a", "xs")}>
                          {acc.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                        <button onClick={() => removeAccount(i)} style={btnStyle("#dc2626", "xs")}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = (bg, size = "md") => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: size === "xs" ? "4px 10px" : size === "sm" ? "6px 14px" : "8px 18px",
  fontSize: size === "xs" ? "0.8rem" : "0.9rem", fontWeight: 600, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6
});
const cardStyle = { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px", marginBottom: 16 };
const inputStyle = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", fontSize: "0.92rem", fontFamily: "inherit", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: "0.85rem", color: "#475569", marginBottom: 4, fontWeight: 600 };
const alertStyle = (bg, color, border) => ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.9rem", fontWeight: 600 });