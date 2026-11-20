import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * The authenticator secret must be read back to check codes, so it cannot be hashed; it is encrypted instead, with
 * AES-256-GCM and a 32-byte key from MFA_ENCRYPTION_KEY (base64). The key lives in the environment or a secrets manager,
 * never the repository or the database, so a copy of the database alone does not reveal anyone's codes.
 */

const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** The key, or null when it is not set: two-step sign-in is then unavailable rather than stored in clear. */
export function readMfaKey(env: Readonly<Record<string, string | undefined>> = process.env): Buffer | null {
  const value = env.MFA_ENCRYPTION_KEY?.trim();
  if (!value) return null;
  const key = Buffer.from(value, 'base64');
  if (key.length !== KEY_BYTES) throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes, base64-encoded.');
  return key;
}

/** Nonce, tag, then ciphertext, in one buffer. A fresh random nonce every time. */
export function encryptSecret(secret: Buffer, key: Buffer): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
}

/** Throws if the data was changed or the key is wrong (GCM checks the tag). */
export function decryptSecret(stored: Buffer, key: Buffer): Buffer {
  const nonce = stored.subarray(0, NONCE_BYTES);
  const tag = stored.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(stored.subarray(NONCE_BYTES + TAG_BYTES)), decipher.final()]);
}
