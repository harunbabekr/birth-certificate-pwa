import api, { buildRequestFormData } from "./api";

const DB_NAME = "birth_requests_db";
const DB_VERSION = 3;
const DRAFT_STORE = "drafts";
const OFFLINE_STORE = "offlineRequests";

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE);
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "requestNumber" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── تسلسل الملفات وتجهيزها للتخزين المحلي ────────────────────────
async function fileToStorable(file) {
  if (!file || !(file instanceof Blob)) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ base64: reader.result, name: file.name, type: file.type });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function storableToFile(s) {
  if (!s?.base64) return null;
  try {
    const res = await fetch(s.base64);
    const blob = await res.blob();
    return new File([blob], s.name || "file", { type: s.type || blob.type });
  } catch {
    return null;
  }
}

async function serializeFiles(files = {}) {
  const result = {};
  for (const [k, f] of Object.entries(files)) {
    result[k] = f ? await fileToStorable(f) : null;
  }
  return result;
}

async function deserializeFiles(stored = {}) {
  const result = {};
  for (const [k, s] of Object.entries(stored)) {
    result[k] = s ? await storableToFile(s) : null;
  }
  return result;
}

// ── إدارة المسودات (Drafts) ──────────────────────────────────
export async function saveDraftRequest(data) {
  const serializedFiles = data.files ? await serializeFiles(data.files) : {};
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).put({ ...data, files: serializedFiles }, "applyDraft");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDraftRequest() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const r = tx.objectStore(DRAFT_STORE).get("applyDraft");
    r.onsuccess = async () => {
      const data = r.result;
      if (!data) return resolve(null);
      if (data.files) {
        data.files = await deserializeFiles(data.files);
      }
      resolve(data);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function clearDraftRequest() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).delete("applyDraft");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ── إدارة الطلبات غير المتصلة (Offline Queue) ────────────────
export async function saveRequestOffline(data) {
  const serializedFiles = data.files ? await serializeFiles(data.files) : {};
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).put({ ...data, files: serializedFiles });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOfflineRequests() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const r = tx.objectStore(OFFLINE_STORE).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => resolve([]);
  });
}

export async function deleteOfflineRequest(requestNumber) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).delete(requestNumber);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ── المزامنة مع الخادم فور عودة الشبكة ───────────────────────
export async function syncOfflineRequests() {
  if (!navigator.onLine) return [];
  const requests = await getAllOfflineRequests();
  if (!requests.length) return [];
  const synced = [];

  for (const req of requests) {
    try {
      const files = req.files ? await deserializeFiles(req.files) : {};
      const formData = buildRequestFormData(req.formValues || {}, files, {
        paymentMethod: req.paymentMethod || "cash",
        paymentChannel: req.paymentChannel || "cash"
      });
      const result = await api.postForm("/requests", formData);
      synced.push({
        offlineRequestNumber: req.requestNumber,
        serverRequestNumber: result.requestNumber
      });
      await deleteOfflineRequest(req.requestNumber);
    } catch {
      // إبقاء الطلب للمحاولة القادمة
    }
  }

  if (synced.length) {
    localStorage.setItem("lastOfflineSync", JSON.stringify(synced));
  }
  return synced;
}