import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CloseButton from "../components/CloseButton";
import api from "../services/api";
import {
  saveUserReceiptLocal,
  getUserReceiptLocal,
  clearUserReceiptLocal
} from "../services/userReceiptsDB";
import "./BankTransfer.css";

const Icons = {
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Upload: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
};

export default function BankTransfer() {
  const navigate = useNavigate();
  const { state } = useLocation();

  let fallback = null;
  try {
    fallback = JSON.parse(localStorage.getItem("pendingBankTransfer") || "null");
  } catch {
    fallback = null;
  }

  const requestId = state?.requestId || fallback?.requestId;
  const requestNumber = state?.requestNumber || fallback?.requestNumber;

  const [paymentInfo, setPaymentInfo] = useState({
    fixedAmount: 0,
    instructions: "",
    accounts: []
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const selectedAccount = useMemo(() => {
    return paymentInfo.accounts.find((item) => item.id === selectedAccountId) || paymentInfo.accounts[0];
  }, [paymentInfo.accounts, selectedAccountId]);

  const transferRef = useMemo(() => {
    return requestNumber ? `BR-${requestNumber}` : `BR-${Date.now()}`;
  }, [requestNumber]);

  const [txId, setTxId] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoredReceiptName, setRestoredReceiptName] = useState("");

  useEffect(() => {
    const loadPaymentInfo = async () => {
      try {
        const data = await api.get("/settings/payment-info");
        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];

        setPaymentInfo({
          fixedAmount: Number(data?.fixedAmount || 0),
          instructions: data?.instructions || "",
          accounts
        });

        if (accounts.length) setSelectedAccountId(accounts[0].id);
      } catch (e) {
        alert(e.message || "تعذر تحميل بيانات الدفع البنكي");
      } finally {
        setSettingsLoading(false);
      }
    };

    loadPaymentInfo();
  }, []);

  useEffect(() => {
    const restore = async () => {
      if (!requestNumber) return;
      const saved = await getUserReceiptLocal(requestNumber).catch(() => null);
      if (!saved) return;

      if (saved.note) setNote(saved.note);
      if (saved.transferTxId) setTxId(saved.transferTxId);
      if (saved.transferAccountId) setSelectedAccountId(saved.transferAccountId);
      if (saved.receiptFile) {
        setReceipt(saved.receiptFile);
        setRestoredReceiptName(saved.receiptFile.name || "receipt");
      }
    };

    restore();
  }, [requestNumber]);

  useEffect(() => {
    if (!requestId || !requestNumber) {
      navigate("/apply", { replace: true });
    }
  }, [requestId, requestNumber, navigate]);

  const saveLastRequest = (payload) => {
    localStorage.setItem("lastSubmittedRequest", JSON.stringify(payload));
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      alert("تم النسخ بنجاح");
    } catch {
      alert("تعذر النسخ التلقائي، يرجى النسخ يدوياً");
    }
  };

  const buildLocalPayload = (pendingSync = false) => ({
    requestNumber,
    requestId,
    transferRef,
    note,
    transferAccountId: selectedAccount?.id || "",
    transferAccountLabel: selectedAccount
      ? `${selectedAccount.label} - ${selectedAccount.accountNumber}`
      : "",
    transferTxId: String(txId).trim(),
    receiptFile: receipt,
    savedAt: new Date().toISOString(),
    pendingSync
  });

  const validate = () => {
    if (!selectedAccount) throw new Error("لا توجد حسابات بنكية متاحة حاليًا");
    if (!paymentInfo.fixedAmount || Number(paymentInfo.fixedAmount) <= 0) {
      throw new Error("المبلغ المطلوب غير محدد");
    }
    if (!/^\d{4}$/.test(String(txId || "").trim())) {
      throw new Error("رقم العملية يجب أن يتكون من 4 أرقام");
    }
    if (!receipt) throw new Error("يرجى اختيار ملف الإشعار");
  };

  const submitTransferAndReceipt = async () => {
    setLoading(true);

    try {
      validate();

      await api.post(`/requests/${requestId}/bank-transfer`, {
        transferRef,
        transferNote: note,
        transferAccountId: selectedAccount.id,
        transferAccountLabel: `${selectedAccount.label} - ${selectedAccount.accountNumber}`,
        transferTxId: String(txId).trim()
      });

      const formData = new FormData();
      formData.append("receipt", receipt);
      await api.postForm(`/requests/${requestId}/receipt`, formData);

      await clearUserReceiptLocal(requestNumber);
      localStorage.removeItem("pendingBankTransfer");

      const payload = { requestNumber, paymentMethod: "bank_transfer" };
      saveLastRequest(payload);

      navigate("/payment-success", { state: payload, replace: true });
    } catch (e) {
      if (!navigator.onLine) {
        await saveUserReceiptLocal(buildLocalPayload(true));
        const payload = { requestNumber, paymentMethod: "bank_transfer" };
        saveLastRequest(payload);
        alert("لا يوجد اتصال بالإنترنت. تم حفظ الإشعار محلياً وسيتم إرساله تلقائياً فور عودة الشبكة.");
        navigate("/payment-success", { state: payload, replace: true });
      } else {
        alert(e.message || "حدث خطأ أثناء إرسال التحويل");
      }
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <>
        <CloseButton />
        <div className="bank-transfer-page">
          <div className="bank-transfer-wrapper">
            <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>جاري تحميل بيانات الدفع...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CloseButton />
      <div className="bank-transfer-page">
        <div className="bank-transfer-wrapper">
          <div className="bank-transfer-header">
            <h2>إتمام التحويل البنكي</h2>
          </div>

          <div className="bank-transfer-layout">
            <div className="bank-transfer-column">
              <div className="bank-card">
                <p className="bank-meta-text">
                  <strong>رقم المعاملة:</strong> {requestNumber}
                  <button type="button" className="bank-mini-btn" onClick={() => copyText(requestNumber)}>
                    <Icons.Copy />
                    <span>نسخ</span>
                  </button>
                  <br />
                  <strong>مرجع الإشعار:</strong> {transferRef}
                  <button type="button" className="bank-mini-btn" onClick={() => copyText(transferRef)}>
                    <Icons.Copy />
                    <span>نسخ</span>
                  </button>
                </p>
              </div>

              <div className="bank-card">
                <h3>المبلغ المطلوب سداده</h3>
                <p className="bank-meta-text">
                  <strong style={{ fontSize: "1.25rem", color: "#0284c7" }}>{paymentInfo.fixedAmount || 0} جنيه سوداني</strong>
                </p>
              </div>

              <div className="bank-card">
                <div className="bank-field">
                  <label>اختر بنك السجل المحول إليه</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="bank-input"
                  >
                    {paymentInfo.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label} ({account.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedAccount && (
                <div className="bank-card">
                  <h3>بيانات الحساب المختار</h3>
                  <p className="bank-meta-text">
                    <strong>اسم الحساب:</strong> {selectedAccount.accountName}
                    <br />
                    <strong>رقم الحساب:</strong> <span dir="ltr">{selectedAccount.accountNumber}</span>
                    <button
                      type="button"
                      className="bank-mini-btn"
                      onClick={() => copyText(selectedAccount.accountNumber)}
                    >
                      <Icons.Copy />
                      <span>نسخ الرقم</span>
                    </button>
                  </p>
                </div>
              )}

              <div className="bank-card">
                <h3>تعليمات السداد</h3>
                <p className="bank-meta-text">
                  {paymentInfo.instructions || "يرجى تحويل الرسوم ورفع صورة الإشعار للمراجعة."}
                </p>
              </div>
            </div>

            <div className="bank-transfer-column bank-transfer-column--sticky">
              <div className="bank-card">
                <div className="bank-form-grid">
                  <div className="bank-field">
                    <label>آخر 4 أرقام من رقم العملية البنكية *</label>
                    <input
                      value={txId}
                      onChange={(e) => setTxId(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="مثال: 4892"
                      inputMode="numeric"
                      maxLength={4}
                      className="bank-input"
                    />
                  </div>

                  <div className="bank-field">
                    <label>ملاحظة اختيارية</label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="اسم المحول أو ملاحظة"
                      className="bank-input"
                    />
                  </div>

                  <div className="bank-field">
                    <label>صورة أو ملف إشعار التحويل *</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setReceipt(file);
                        setRestoredReceiptName(file?.name || "");
                      }}
                      className="bank-input"
                    />
                    {(receipt || restoredReceiptName) && (
                      <small className="bank-file-name">
                        📎 {receipt?.name || restoredReceiptName || "receipt"}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="bank-card">
                <button
                  className="bank-btn bank-btn--primary"
                  type="button"
                  onClick={submitTransferAndReceipt}
                  disabled={loading}
                >
                  <Icons.Upload />
                  <span>{loading ? "جاري الإرسال..." : "إرسال وتأكيد الإشعار"}</span>
                </button>
                <p className="bank-help-text">
                  يتم نقل الطلب مباشرة إلى مرحلة التدقيق المالي ومراجعة الإشعار من قبل موظف السجل.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}