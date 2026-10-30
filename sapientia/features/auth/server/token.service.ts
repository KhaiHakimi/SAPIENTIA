import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/** 256 random bits, URL-safe: used for session cookies and invite links. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored only as SHA-256, so the database never holds a usable token. */
export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}
