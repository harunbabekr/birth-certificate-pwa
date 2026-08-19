import crypto from "crypto";

export function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function normalizePhone(value = "") {
  let phone = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (!phone) return "";

  if (phone.startsWith("249")) {
    phone = `+${phone}`;
  }

  if (/^\+249\d+$/.test(phone)) {
    return phone;
  }

  if (/^09\d{8}$/.test(phone) || /^01\d{8}$/.test(phone)) {
    return `+249${phone.slice(1)}`;
  }

  if (/^090\d{7}$/.test(phone) || /^010\d{7}$/.test(phone)) {
    return `+249${phone.slice(1)}`;
  }

  if (/^9\d{8}$/.test(phone) || /^1\d{8}$/.test(phone)) {
    return `+249${phone}`;
  }

  if (/^90\d{7}$/.test(phone) || /^10\d{7}$/.test(phone)) {
    return `+249${phone}`;
  }

  return phone;
}

export function normalizeIdentifier(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) {
    return normalizeEmail(raw);
  }
  return normalizePhone(raw);
}

export function detectIdentifierType(value = "") {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return "";
  if (normalized.includes("@")) {
    return "email";
  }
  if (normalized.startsWith("+")) {
    return "phone";
  }
  return "";
}

export function isSudanesePhone(value = "") {
  const phone = normalizePhone(value);
  return /^\+249(9\d{8}|1\d{8}|90\d{7}|10\d{7})$/.test(phone);
}

export function generateOtpCode() {
  const { randomInt } = crypto;
  return String(randomInt(100000, 999999));
}

export function hashOtp(code = "") {
  return crypto
    .createHash("sha256")
    .update(String(code))
    .digest("hex");
}