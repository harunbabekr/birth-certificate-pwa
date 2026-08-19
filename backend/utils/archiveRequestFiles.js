import fs from "fs";
import path from "path";
import { uploadDir } from "../middleware/upload.js";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeMove(oldPath, newPath) {
  if (!oldPath) return null;
  const resolvedOld = path.resolve(oldPath);
  const resolvedNew = path.resolve(newPath);

  if (!fs.existsSync(resolvedOld)) return oldPath;

  ensureDir(path.dirname(resolvedNew));

  try {
    fs.renameSync(resolvedOld, resolvedNew);
    return newPath;
  } catch {
    try {
      fs.copyFileSync(resolvedOld, resolvedNew);
      fs.unlinkSync(resolvedOld);
      return newPath;
    } catch (err) {
      console.error(`Failed to archive file from ${oldPath} to ${newPath}:`, err.message);
      return oldPath;
    }
  }
}

export default function archiveRequestFiles(requestDoc) {
  if (!requestDoc || !requestDoc.requestNumber) return;

  const requestNumber = requestDoc.requestNumber;
  const archiveDir = path.join(uploadDir, "archive", requestNumber);
  ensureDir(archiveDir);

  const fields = ["fatherId", "motherId", "astatement", "marriageCert", "receipt"];

  fields.forEach((field) => {
    const currentPath = requestDoc[field];
    if (!currentPath) return;

    const normalized = path.normalize(String(currentPath));
    const archiveSegment = path.normalize(path.join("archive", requestNumber));
    if (normalized.includes(archiveSegment)) return;

    const fileName = path.basename(currentPath);
    const destination = path.join(archiveDir, `${field}-${fileName}`);
    requestDoc[field] = safeMove(currentPath, destination);
  });

  requestDoc.archivedAt = new Date();
  requestDoc.isArchived = true;
}