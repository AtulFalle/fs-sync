import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { requiredEnv } from './config';

export interface OAuthState {
  orgId: string;
  nonce: string;
  issuedAt: number;
}

export function createSignedState(orgId: string): string {
  const payload: OAuthState = {
    orgId,
    nonce: cryptoRandom(),
    issuedAt: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySignedState(state: string): OAuthState {
  const [encodedPayload, providedSignature] = state.split('.');
  if (!encodedPayload || !providedSignature) {
    throw new Error('Invalid OAuth state');
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(providedSignature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new Error('Invalid OAuth state signature');
  }

  const parsed = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8'),
  ) as OAuthState;
  if (!parsed.orgId || Date.now() - parsed.issuedAt > 15 * 60 * 1000) {
    throw new Error('Expired OAuth state');
  }
  return parsed;
}

function sign(value: string): string {
  return createHmac('sha256', requiredEnv('TOKEN_ENCRYPTION_KEY'))
    .update(value)
    .digest('base64url');
}

function cryptoRandom(): string {
  return randomBytes(24).toString('base64url');
}
