const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp', '.intranet'];
const BLOCKED_HOSTS = ['localhost', 'metadata', 'metadata.google.internal'];

function ipv4Private(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const nums = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return false;
    if (p.length > 1 && p.startsWith('0')) return true;
    const n = parseInt(p, 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return true;
    nums.push(n);
  }
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

export function validateTargetUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid address.' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'Only secure addresses are checked.' };
  if (url.username || url.password) return { ok: false, reason: 'Addresses with credentials are not checked.' };
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host)) return { ok: false, reason: 'This address cannot be checked.' };
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return { ok: false, reason: 'This address cannot be checked.' };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && ipv4Private(host)) return { ok: false, reason: 'Private addresses cannot be checked.' };
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) return { ok: false, reason: 'Private addresses cannot be checked.' };
  return { ok: true, url };
}

async function fetchLimited(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function runScan(startUrl) {
  let current = startUrl;
  let redirectCount = 0;
  let res = null;
  for (let i = 0; i <= 5; i++) {
    res = await fetchLimited(current, 10000);
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current).toString();
      const check = validateTargetUrl(next);
      if (!check.ok) return { ok: false, reason: 'Redirect target cannot be checked.' };
      current = next;
      redirectCount++;
      continue;
    }
    break;
  }
  if (!res) return { ok: false, reason: 'The website did not respond.' };
  const headers = {
    hsts: res.headers.has('strict-transport-security'),
    nosniff: (res.headers.get('x-content-type-options') || '').toLowerCase() === 'nosniff',
    frame: res.headers.has('x-frame-options') || res.headers.has('content-security-policy'),
    csp: res.headers.has('content-security-policy'),
    referrer: res.headers.has('referrer-policy'),
    permissions: res.headers.has('permissions-policy'),
  };
  try {
    const body = await res.text();
    void body.slice(0, 10);
  } catch {
  }
  const probes = [];
  for (const path of ['/.env', '/.git/HEAD', '/wp-login.php', '/phpmyadmin/']) {
    try {
      const probe = await fetchLimited(new URL(path, current).toString(), 10000);
      probes.push({ path, status: probe.status });
    } catch {
      probes.push({ path, status: 'error' });
    }
  }
  return { ok: true, finalUrl: current, status: res.status, redirectCount, headers, probes };
}
