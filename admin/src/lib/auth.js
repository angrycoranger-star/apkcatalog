import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

/**
 * Single-user auth: a shared password (ADMIN_PASSWORD) unlocks the panel and
 * the server hands back an HMAC-signed session cookie. No database, no user
 * store — just "is this the owner".
 */
const COOKIE_NAME = 'apk4orge_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secret() {
  const value = process.env.ADMIN_SECRET;
  if (!value || value.length < 16) {
    throw new Error('ADMIN_SECRET must be set to a random string of at least 16 characters');
  }
  return value;
}

/** Constant-time password check so timing can't leak the length/prefix. */
export function passwordMatches(input) {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  // Compare fixed-size digests so unequal lengths don't throw or leak.
  const ha = createHmac('sha256', 'cmp').update(a).digest();
  const hb = createHmac('sha256', 'cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

/** Token = "<expiry>.<sig>"; the signature covers the expiry. */
export function issueToken() {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

export function tokenIsValid(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export function cookieHeader(token) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${MAX_AGE_SECONDS}`
  ];
  return attrs.join('; ');
}

export function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function tokenFromCookie(cookieString) {
  if (!cookieString) return null;
  for (const part of cookieString.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return rest.join('=');
  }
  return null;
}

export function isAuthed(request) {
  const token = tokenFromCookie(request.headers.get('cookie'));
  return token ? tokenIsValid(token) : false;
}

/** For a fresh ADMIN_SECRET suggestion in docs / first run. */
export function suggestSecret() {
  return randomBytes(24).toString('base64url');
}

export { COOKIE_NAME };
