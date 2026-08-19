import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CloseButton from "../components/CloseButton";
import {
  saveDraftRequest,
  getDraftRequest,
  clearDraftRequest,
  saveRequestOffline
} from "../services/indexedDB";
import api, { buildRequestFormData } from "../services/api";
import "./ApplyRequest.css";

const Icons = {
  File: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Baby: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5"/>
      <path d="M20 21a8 8 0 0 0-16 0"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
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

const REGISTRY_OFFICES = ["سنار", "سنجة", "الدندر", "الدالي والمزموم", "السوكي"];

export default function ApplyRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requestNumber, setRequestNumber] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paid, setPaid] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const [formValues, setFormValues] = useState({
    childName: "",
    birthDate: "",
    gender: "",
    birthPlace: "",
    applicantName: "",
    applicantNationalId: "",
    applicantRelation: "",
    fatherName: "",
    motherName: "",
    registryOffice: "",
    deliveryMethod: "pickup"
  });

  const [files, setFiles] = useState({
    fatherId: null,
    motherId: null,
    astatement: null,
    marriageCert: null
  });

  useEffect(() => {
    const restoreDraft = async () => {
      const draft = await getDraftRequest().catch(() => null);

      if (draft?.formValues) {
        setFormValues((prev) => ({ ...prev, ...draft.formValues }));
      }

      if (draft?.files) {
        setFiles({
          fatherId: draft.files?.fatherId || null,
          motherId: draft.files?.motherId || null,
          astatement: draft.files?.astatement || null,
          marriageCert: draft.files?.marriageCert || null
        });
      }
      if (draft?.paymentMethod) {
        setPaymentMethod(draft.paymentMethod);
      }

      if (typeof draft?.paid === "boolean") {
        setPaid(draft.paid);
      }
    };

    restoreDraft();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftRequest({
        formValues,
        files,
        paymentMethod,
        paid
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [formValues, files, paymentMethod, paid]);

  const updateField = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setOfflineSaved(false);
  };

  const saveLastRequest = (payload) => {
    localStorage.setItem("lastSubmittedRequest", JSON.stringify(payload));
  };

  const validateBeforeSubmit = () => {
    if (!formValues.childName || !formValues.birthDate || !formValues.gender) {
      throw new Error("يرجى إدخال بيانات المولود الأساسية");
    }

    if (
      !formValues.applicantName ||
      !formValues.applicantNationalId ||
      !formValues.applicantRelation
    ) {
      throw new Error("يرجى إدخال بيانات مقدم الطلب كاملة");
    }

    if (!formValues.registryOffice || !formValues.deliveryMethod) {
      throw new Error("يرجى اختيار المكتب وطريقة الاستلام");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      validateBeforeSubmit();
    } catch (error) {
      alert(error.message);
      return;
    }

    if (paymentMethod !== "cash" || !paid) {
      alert("اختر الدفع النقدي أو استخدم خيار الدفع الإلكتروني/البنكي.");
      return;
    }

    setLoading(true);
    setOfflineSaved(false);

    const offlineRequestNumber = `OFF-${Date.now()}`;
    const offlineData = {
      requestNumber: offlineRequestNumber,
      formValues,
      paymentMethod: "cash",
      paymentChannel: "cash",
      createdAt: new Date().toISOString(),
      files
    };

    try {
      const formData = buildRequestFormData(formValues, files, {
        paymentMethod: "cash",
        paymentChannel: "cash"
      });

      const result = await api.postForm("/requests", formData);

      setRequestNumber(result.requestNumber);
      await clearDraftRequest();

      const payload = {
        requestNumber: result.requestNumber,
        paymentMethod: "cash"
      };

      saveLastRequest(payload);

      navigate("/payment-success", {
        state: payload,
        replace: true
      });
    } catch (error) {
      if (!navigator.onLine) {
        try {
          await saveRequestOffline(offlineData);
          setRequestNumber(offlineRequestNumber);
          setOfflineSaved(true);

          saveLastRequest({
            requestNumber: offlineRequestNumber,
            paymentMethod: "cash",
            offline: true
          });

          alert(
            "⚠️ لا يوجد اتصال بالإنترنت، تم حفظ الطلب محليًا مع المرفقات وسيتم إرساله عند رجوع الاتصال."
          );
        } catch {
          alert("تعذر حفظ الطلب محليًا. حاول مرة أخرى.");
        }
      } else {
        alert(error.message || "فشل إرسال الطلب، حاول مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  const goToPaymentPage = async () => {
    try {
      validateBeforeSubmit();

      await saveDraftRequest({
        formValues,
        files,
        paymentMethod,
        paid
      });

      navigate("/payment", { state: { fromApply: true } });
    } catch (error) {
      alert(error.message || "يرجى استكمال البيانات أولًا");
    }
  };

  return (
    <>
      <CloseButton />

      <div className="apply-page">
        <form className="apply-form" onSubmit={handleSubmit}>
          <div className="apply-header">
            <div className="apply-header__text">
              <h2>تقديم طلب شهادة ميلاد</h2>
              <p>أدخل البيانات الرسمية وارفع المستندات المطلوبة لإتمام المعاملة.</p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="apply-back-btn"
            >
              الرئيسية
            </button>
          </div>

          {!navigator.onLine && (
            <div className="apply-alert apply-alert--warning">
              <Icons.WifiOff />
              <span>وضع عدم الاتصال: يمكنك تعبئة وحفظ الطلب محلياً ليتم إرساله فور توفر الشبكة.</span>
            </div>
          )}

          {requestNumber && (
            <div className="apply-alert apply-alert--success">
              <div>
                <strong>{offlineSaved ? "تم حفظ الطلب محلياً بنجاح:" : "تم إرسال الطلب بنجاح:"}</strong>
                <span style={{ marginRight: 8, fontFamily: "monospace", fontSize: "1.1rem" }}>{requestNumber}</span>
              </div>
            </div>
          )}

          <div className="apply-layout">
            <div className="apply-column">
              <section className="apply-section">
                <h3 className="apply-section__title">
                  <Icons.Baby />
                  <span>بيانات المولود</span>
                </h3>

                <div className="apply-grid">
                  <div className="apply-field apply-field--full">
                    <label>اسم المولود رباعي *</label>
                    <input
                      value={formValues.childName}
                      onChange={(e) => updateField("childName", e.target.value)}
                      placeholder="الاسم الكامل للمولود"
                      required
                    />
                  </div>

                  <div className="apply-field">
                    <label>تاريخ الميلاد *</label>
                    <input
                      type="date"
                      value={formValues.birthDate}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                      required
                    />
                  </div>

                  <div className="apply-field">
                    <label>النوع *</label>
                    <select
                      value={formValues.gender}
                      onChange={(e) => updateField("gender", e.target.value)}
                      required
                    >
                      <option value="">اختر النوع</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  <div className="apply-field">
                    <label>مكان الميلاد</label>
                    <input
                      value={formValues.birthPlace}
                      onChange={(e) => updateField("birthPlace", e.target.value)}
                      placeholder="المدينة / المستشفى"
                    />
                  </div>

                  <div className="apply-field">
                    <label>اسم الأب</label>
                    <input
                      value={formValues.fatherName}
                      onChange={(e) => updateField("fatherName", e.target.value)}
                    />
                  </div>

                  <div className="apply-field apply-field--full">
                    <label>اسم الأم الكامل</label>
                    <input
                      value={formValues.motherName}
                      onChange={(e) => updateField("motherName", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="apply-section">
                <h3 className="apply-section__title">
                  <Icons.File />
                  <span>المستندات الرسمية</span>
                </h3>

                <div className="apply-grid">
                  <div className="apply-field">
                    <label>هوية الأب (بطاقة / جواز)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          fatherId: e.target.files?.[0] || null
                        }))
                      }
                    />
                    {files.fatherId && <small>📎 {files.fatherId.name}</small>}
                  </div>

                  <div className="apply-field">
                    <label>هوية الأم</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          motherId: e.target.files?.[0] || null
                        }))
                      }
                    />
                    {files.motherId && <small>📎 {files.motherId.name}</small>}
                  </div>

                  <div className="apply-field">
                    <label>إفادة المستشفى / القابلة</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          astatement: e.target.files?.[0] || null
                        }))
                      }
                    />
                    {files.astatement && <small>📎 {files.astatement.name}</small>}
                  </div>

                  <div className="apply-field">
                    <label>قسيمة الزواج</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          marriageCert: e.target.files?.[0] || null
                        }))
                      }
                    />
                    {files.marriageCert && <small>📎 {files.marriageCert.name}</small>}
                  </div>
                </div>
              </section>
            </div>

            <div className="apply-column">
              <section className="apply-section">
                <h3 className="apply-section__title">
                  <Icons.User />
                  <span>بيانات مقدم الطلب</span>
                </h3>

                <div className="apply-grid">
                  <div className="apply-field apply-field--full">
                    <label>اسم مقدم الطلب *</label>
                    <input
                      value={formValues.applicantName}
                      onChange={(e) => updateField("applicantName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="apply-field">
                    <label>الرقم الوطني *</label>
                    <input
                      value={formValues.applicantNationalId}
                      onChange={(e) => updateField("applicantNationalId", e.target.value)}
                      placeholder="11 رقم"
                      required
                    />
                  </div>

                  <div className="apply-field">
                    <label>صلة القرابة *</label>
                    <select
                      value={formValues.applicantRelation}
                      onChange={(e) => updateField("applicantRelation", e.target.value)}
                      required
                    >
                      <option value="">اختر الصلة</option>
                      <option value="father">الأب</option>
                      <option value="mother">الأم</option>
                      <option value="guardian">ولي أمر معتمد</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div className="apply-field">
                    <label>مكتب السجل المدني *</label>
                    <select
                      value={formValues.registryOffice}
                      onChange={(e) => updateField("registryOffice", e.target.value)}
                      required
                    >
                      <option value="">اختر المكتب</option>
                      {REGISTRY_OFFICES.map((office) => (
                        <option key={office} value={office}>
                          {office}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="apply-field">
                    <label>طريقة الاستلام *</label>
                    <select
                      value={formValues.deliveryMethod}
                      onChange={(e) => updateField("deliveryMethod", e.target.value)}
                      required
                    >
                      <option value="pickup">استلام مباشر من المكتب</option>
                      <option value="review_then_pickup">مراجعة النسخة الرقمية أولاً</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="apply-section">
                <h3 className="apply-section__title">
                  <Icons.CreditCard />
                  <span>طريقة السداد</span>
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    type="button"
                    className="apply-btn apply-btn--outline"
                    onClick={goToPaymentPage}
                  >
                    <Icons.CreditCard />
                    <span>سداد إلكتروني / تحويل بنكي</span>
                  </button>

                  <label className="apply-payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => {
                        setPaymentMethod("cash");
                        setPaid(true);
                      }}
                    />
                    <div>
                      <strong>دفع نقدي مباشر في مكتب السجل</strong>
                    </div>
                  </label>

                  {paid && (
                    <div className="apply-alert apply-alert--info">
                      <span>الخيار المحدد: {paymentMethod === "cash" ? "نقداً عند الحضور" : "دفع بنكي / إلكتروني"}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="apply-section" style={{ background: "transparent", border: "none", padding: 0 }}>
                <button type="submit" className="apply-btn apply-btn--primary" disabled={loading}>
                  {loading ? "جاري المعالجة..." : "تأكيد وإرسال الطلب"}
                </button>
              </section>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}