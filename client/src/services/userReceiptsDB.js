import api from "./api";

const DB_NAME = "birthPWA";
const DB_VERSION = 2;
const STORE = "userReceipts";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "requestNumber" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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
    return new File([blob], s.name || "receipt", { type: s.type || blob.type });
  } catch {
    return null;
  }
}

export async function saveUserReceiptLocal(payload) {
  const storable = { ...payload };
  if (payload.receiptFile instanceof Blob) {
    storable.receiptFile = await fileToStorable(payload.receiptFile);
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(storable);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUserReceiptLocal(requestNumber) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).get(requestNumber);
    r.onsuccess = async () => {
      const data = r.result;
      if (!data) return resolve(null);
      if (data.receiptFile && data.receiptFile.base64) {
        data.receiptFile = await storableToFile(data.receiptFile);
      }
      resolve(data);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function getAllUserReceiptsLocal() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const r = tx.objectStore(STORE).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => resolve([]);
  });
}

export async function clearUserReceiptLocal(requestNumber) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(requestNumber);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingUserReceipts() {
  if (!navigator.onLine) return false;
  const all = await getAllUserReceiptsLocal().catch(() => []);
  const pending = all.filter((r) => r?.pendingSync && r?.requestId);
  if (!pending.length) return false;

  let syncedAny = false;
  for (const item of pending) {
    try {
      await api.post(`/requests/${item.requestId}/bank-transfer`, {
        transferRef: item.transferRef,
        transferNote: item.note || "",
        transferAccountId: item.transferAccountId,
        transferAccountLabel: item.transferAccountLabel,
        transferTxId: item.transferTxId
      });

      if (item.receiptFile?.base64) {
        const file = await storableToFile(item.receiptFile);
        if (file) {
          const fd = new FormData();
          fd.append("receipt", file);
          await api.postForm(`/requests/${item.requestId}/receipt`, fd);
        }
      }

      await clearUserReceiptLocal(item.requestNumber);
      syncedAny = true;
    } catch {
      // إبقاء الإشعار للمحاولة التالية
    }
  }
  return syncedAny;
}