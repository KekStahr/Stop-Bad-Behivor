// Encrypts sensitive local data (faith area). Uses the Windows user account (DPAPI via
// Electron safeStorage); falls back to AES-256-GCM with a per-installation key file.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function createSealer({ safeStorage, directory }) {
  const keyFile = path.join(directory, "faith.key");
  const osAvailable = () => Boolean(safeStorage?.isEncryptionAvailable?.());
  function fileKey() {
    try {
      const key = Buffer.from(fs.readFileSync(keyFile, "utf8"), "base64");
      if (key.length === 32) return key;
    } catch {
      // created below
    }
    const key = crypto.randomBytes(32);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(keyFile, key.toString("base64"), { mode: 0o600 });
    return key;
  }
  return {
    seal(text) {
      if (osAvailable()) return `os:${safeStorage.encryptString(text).toString("base64")}`;
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", fileKey(), iv);
      const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
      return `gcm:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")}`;
    },
    unseal(value) {
      const split = String(value || "").indexOf(":");
      if (split < 0) return null;
      const kind = value.slice(0, split);
      const raw = Buffer.from(value.slice(split + 1), "base64");
      if (kind === "os") return safeStorage.decryptString(raw);
      if (kind === "gcm") {
        const decipher = crypto.createDecipheriv("aes-256-gcm", fileKey(), raw.subarray(0, 12));
        decipher.setAuthTag(raw.subarray(12, 28));
        return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
      }
      return null;
    },
  };
}

module.exports = { createSealer };
