import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const rawKey = requiredKey();
  if (/^[a-f0-9]{64}$/i.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  const base64Key = Buffer.from(rawKey, 'base64');
  if (base64Key.length === 32) {
    return base64Key;
  }

  const utf8Key = Buffer.from(rawKey, 'utf8');
  if (utf8Key.length === 32) {
    return utf8Key;
  }

  throw new Error(
    'TOKEN_ENCRYPTION_KEY must be 32 bytes, base64, or 64 hex chars',
  );
}

function requiredKey(): string {
  const value = process.env.TOKEN_ENCRYPTION_KEY;
  if (!value) {
    throw new Error('Missing TOKEN_ENCRYPTION_KEY');
  }
  return value;
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function decryptSecret(value: string): string {
  const [ivRaw, authTagRaw, encryptedRaw] = value.split('.');
  if (!ivRaw || !authTagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivRaw, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
