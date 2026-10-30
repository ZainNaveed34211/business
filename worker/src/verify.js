export const BUSINESS_ORIGIN = 'https://business.kluzar.com';
export const AUD = 'kluzar-business-api';
export const KID = 'business-assertion-v1';

export function corsHeaders(origin) {
  if (origin !== BUSINESS_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
  };
}

export function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      ...corsHeaders(origin),
    },
  });
}

export function b64urlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function b64urlJson(input) {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(input)));
}

export async function verifyAssertion(token, publicJwk, nowSec) {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) throw new Error('bad token');
  const header = b64urlJson(parts[0]);
  if (header.alg !== 'EdDSA' || header.typ !== 'JWT' || header.kid !== KID) throw new Error('bad header');
  const payload = b64urlJson(parts[1]);
  if (payload.aud !== AUD) throw new Error('bad audience');
  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || typeof payload.jti !== 'string') throw new Error('bad claims');
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') throw new Error('bad times');
  if (payload.exp <= nowSec || payload.iat > nowSec + 60 || payload.exp - payload.iat > 301) throw new Error('bad lifetime');
  const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']);
  const signingInput = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = b64urlDecode(parts[2]);
  const valid = await crypto.subtle.verify('Ed25519', key, signature, signingInput);
  if (!valid) throw new Error('bad signature');
  return payload;
}

export async function authenticate(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (origin !== BUSINESS_ORIGIN) {
    const err = new Error('Origin not allowed.');
    err.status = 403;
    throw err;
  }
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.length < 16) {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  let publicJwk;
  try {
    publicJwk = JSON.parse(env.BUSINESS_ASSERTION_PUBLIC_KEY);
  } catch {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  let payload;
  try {
    payload = await verifyAssertion(auth.slice(7), publicJwk, Math.floor(Date.now() / 1000));
  } catch {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(payload.sid).first();
  if (!session || session.user_id !== payload.sub) {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ? AND status = 'active'").bind(payload.sub).first();
  if (!user) {
    const err = new Error('Sign-in required.');
    err.status = 401;
    throw err;
  }
  const entitlement = await env.DB.prepare('SELECT * FROM entitlements WHERE user_id = ?').bind(payload.sub).first();
  const plan = entitlement && typeof entitlement.plan === 'string' ? entitlement.plan : 'free';
  const premium = entitlement && entitlement.status === 'active' && (plan === 'growth' || plan === 'max');
  return { userId: payload.sub, plan, premium: premium === true };
}

export function planGate(auth, maxOnly) {
  if (!auth.premium) return false;
  if (maxOnly) return auth.plan === 'max';
  return auth.plan === 'growth' || auth.plan === 'max';
}

export async function checkRateLimit(db, userId, endpoint, limit, windowSec) {
  const windowStart = Math.floor(Date.now() / 1000 / windowSec);
  const row = await db.prepare('SELECT * FROM business_rate_limits WHERE user_id = ? AND endpoint = ? AND window_start = ?').bind(userId, endpoint, windowStart).first();
  if (!row) {
    await db.prepare('INSERT INTO business_rate_limits (user_id, endpoint, window_start, count) VALUES (?, ?, ?, 1)').bind(userId, endpoint, windowStart).run();
    return true;
  }
  if (row.count >= limit) return false;
  await db.prepare('UPDATE business_rate_limits SET count = count + 1 WHERE user_id = ? AND endpoint = ? AND window_start = ?').bind(userId, endpoint, windowStart).run();
  return true;
}

export async function readJson(request) {
  try {
    const data = await request.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}
