// قراءة الرابط مع فحص الاسمين المحتملين وضمان عدم وجود شرطة مائلة في النهاية
const rawUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://birth-cert-backend.onrender.com/api";

const API_URL = rawUrl.replace(/\/$/, "");

// دالة مساعدة لضمان دمج الرابط والمسار الفرعي بفاصل مائل سليم دائماً
function buildUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
}

function safeParseJSON(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function getStoredUser() {
  return safeParseJSON(localStorage.getItem("user"), null);
}

function setStoredAuth(token, user) {
  if (token) localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function appendIfPresent(formData, key, value) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
}

function appendFileIfPresent(formData, key, file) {
  if (!file) return;
  if (file instanceof Blob || (typeof File !== "undefined" && file instanceof File)) {
    const fileName = typeof file.name === "string" && file.name ? file.name : `${key}.bin`;
    formData.append(key, file, fileName);
  }
}

function buildRequestFormData(formValues = {}, files = {}, extra = {}) {
  const formData = new FormData();

  appendIfPresent(formData, "childName", String(formValues.childName || "").trim());
  appendIfPresent(formData, "birthDate", String(formValues.birthDate || "").trim());
  appendIfPresent(formData, "gender", String(formValues.gender || "").trim());
  appendIfPresent(formData, "birthPlace", String(formValues.birthPlace || "").trim());
  appendIfPresent(formData, "applicantName", String(formValues.applicantName || "").trim());
  appendIfPresent(formData, "applicantNationalId", String(formValues.applicantNationalId || "").trim());
  appendIfPresent(formData, "applicantRelation", String(formValues.applicantRelation || "").trim());
  appendIfPresent(formData, "fatherName", String(formValues.fatherName || "").trim());
  appendIfPresent(formData, "motherName", String(formValues.motherName || "").trim());
  appendIfPresent(formData, "registryOffice", String(formValues.registryOffice || "").trim());
  appendIfPresent(formData, "deliveryMethod", String(formValues.deliveryMethod || "").trim());
  appendIfPresent(formData, "paymentMethod", extra.paymentMethod);
  appendIfPresent(formData, "paymentChannel", extra.paymentChannel);

  appendFileIfPresent(formData, "fatherId", files.fatherId);
  appendFileIfPresent(formData, "motherId", files.motherId);
  appendFileIfPresent(formData, "astatement", files.astatement);
  appendFileIfPresent(formData, "marriageCert", files.marriageCert);

  return formData;
}

async function handleResponse(res) {
  if (res.status === 401) {
    clearStoredAuth();
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : { message: await res.text().catch(() => "") };

  if (!res.ok) {
    throw new Error(data?.message || `خطأ في الخادم (HTTP ${res.status})`);
  }
  return data;
}

const api = {
  async get(url) {
    const res = await fetch(buildUrl(url), {
      headers: authHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },
  async getBlob(url) {
    const res = await fetch(buildUrl(url), {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 401) clearStoredAuth();
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || "تعذر تحميل الملف");
    }
    return res.blob();
  },
  async post(url, body) {
    const res = await fetch(buildUrl(url), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    });
    return handleResponse(res);
  },
  async postForm(url, formData) {
    const res = await fetch(buildUrl(url), {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: formData,
    });
    return handleResponse(res);
  },
  async put(url, body) {
    const res = await fetch(buildUrl(url), {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(body ?? {}),
    });
    return handleResponse(res);
  },
  async delete(url) {
    const res = await fetch(buildUrl(url), {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    return handleResponse(res);
  },
};

export { API_URL, buildRequestFormData, clearStoredAuth, getStoredUser, safeParseJSON, setStoredAuth };
export default api;