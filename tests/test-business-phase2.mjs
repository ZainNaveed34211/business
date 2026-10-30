import { profileScore, consistencyScore } from '../src/lib/scores.ts';
import { buildRecommendations, reviewThemes } from '../src/lib/guide.ts';
import { securityFindings, securityScore, toCsv } from '../src/lib/data.ts';
import { verifyAssertion, BUSINESS_ORIGIN } from '../worker/src/verify.js';
import { securityFindings as workerFindings, securityScore as workerScore } from '../worker/src/checks.js';
import { validateTargetUrl } from '../worker/src/scan.js';
import handler from '../worker/src/index.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('PASS ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + ': ' + (e && e.message ? e.message : e));
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) throw new Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}

function dayOffset(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

function fullProfile() {
  return { id: 'profile', businessName: 'Acme', industry: 'Retail', businessType: 'Shop', website: 'https://example.com', category: 'Store', description: 'Great shop', address: '1 Main Street', phone: '123', hours: '9-5', targetAudience: 'Everyone', locations: 'Worldwide', objectives: [], platforms: [], priorities: '', services: 'Sales', photosCount: '10' };
}

function baseData(overrides) {
  return Object.assign({ profile: null, keywords: [], competitors: [], reviews: [], calendar: [], contents: [], campaigns: [], strategies: [], shorts: [], goals: [], guideDone: [], securityRuns: [], scoreHistory: [] }, overrides || {});
}

await test('profile score empty is 0', () => {
  const s = profileScore(null);
  eq(s.score, 0, 'score');
  eq(s.missing.length, 12, 'missing');
});

await test('profile score full is 100', () => {
  eq(profileScore(fullProfile()).score, 100, 'score');
});

await test('profile score name plus website is 27', () => {
  const p = fullProfile();
  for (const k of Object.keys(p)) {
    if (k !== 'id' && k !== 'businessName' && k !== 'website' && k !== 'objectives' && k !== 'platforms') p[k] = '';
  }
  eq(profileScore(p).score, 27, 'score');
});

await test('consistency score null without frequency', () => {
  const c = consistencyScore(baseData({}), null);
  eq(c.score, null, 'score');
});

await test('consistency score from published count', () => {
  const data = baseData({ calendar: [{ status: 'published', date: dayOffset(-2) }, { status: 'published', date: dayOffset(-5) }, { status: 'published', date: dayOffset(-9) }] });
  const c = consistencyScore(data, 3);
  eq(c.expected30, 13, 'expected');
  eq(c.score, 23, 'score');
});

await test('recommendations for empty growth data exclude security', () => {
  const recs = buildRecommendations(baseData({}), 'growth');
  const ids = recs.map((r) => r.id);
  if (!ids.includes('profile') || !ids.includes('keywords') || !ids.includes('calendar7')) throw new Error('missing core recs: ' + ids.join(','));
  if (ids.includes('security')) throw new Error('security rec leaked to growth');
});

await test('recommendations for max without security run include security', () => {
  const recs = buildRecommendations(baseData({}), 'max');
  if (!recs.map((r) => r.id).includes('security')) throw new Error('security rec missing for max');
});

await test('recommendations empty for complete data', () => {
  const data = baseData({
    profile: fullProfile(),
    keywords: [{ id: 'k1', keyword: 'acme', group: '', location: '', landingPage: 'https://example.com', createdAt: '' }],
    competitors: [{ id: 'c1' }],
    reviews: [{ id: 'r1', replied: true }],
    calendar: [{ status: 'scheduled', date: dayOffset(3) }, { status: 'published', date: dayOffset(-2) }],
    strategies: [{ frequency: '3' }],
    campaigns: [{ id: 'ca1' }],
    shorts: [{ id: 's1' }],
    securityRuns: [{ id: 'sr1' }],
  });
  eq(buildRecommendations(data, 'max').length, 0, 'recs');
});

await test('review themes count words', () => {
  const t = reviewThemes(['Great service, great staff', 'Slow delivery and slow response']);
  eq(t.positive[0].word, 'great', 'positive word');
  eq(t.positive[0].count, 2, 'positive count');
  eq(t.negative[0].word, 'slow', 'negative word');
  eq(t.negative[0].count, 2, 'negative count');
});

await test('security score and findings agree', () => {
  const answers = { https: 'yes', headers: 'yes', exposed: 'no', updates: 'yes', forms: 'no', privacy: 'yes', backups: 'unknown', accounts: 'yes' };
  eq(securityScore(answers), 71, 'score');
  eq(securityFindings(answers).length, 2, 'findings');
  eq(workerScore(answers), 71, 'worker score');
  eq(workerFindings(answers).length, 2, 'worker findings');
  eq(securityScore({}), null, 'empty null');
});

await test('csv escapes quotes', () => {
  const out = toCsv([['a"b', 'c']]);
  eq(out, '"a""b","c"', 'csv');
});

await test('scan validation rejects private addresses', () => {
  eq(validateTargetUrl('https://192.168.1.1/').ok, false, 'private ip');
  eq(validateTargetUrl('http://example.com/').ok, false, 'http');
  eq(validateTargetUrl('https://localhost/').ok, false, 'localhost');
  eq(validateTargetUrl('https://example.com/').ok, true, 'public');
});

const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

async function makeToken(sub, sid, overrides) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', typ: 'JWT', kid: 'business-assertion-v1' };
  const payload = Object.assign({ sub, sid, aud: 'kluzar-business-api', iat: now, exp: now + 300, jti: 'jti-' + sub + '-' + Date.now() + '-' + Math.random() }, overrides || {});
  const input = b64urlJson(header) + '.' + b64urlJson(payload);
  const sig = await crypto.subtle.sign('Ed25519', keyPair.privateKey, new TextEncoder().encode(input));
  return input + '.' + Buffer.from(sig).toString('base64url');
}

class MockDb {
  constructor() {
    this.tables = {
      sessions: [{ id: 'sess-1', user_id: 'user-1', expires_at: new Date(Date.now() + 3600000).toISOString() }, { id: 'sess-2', user_id: 'user-2', expires_at: new Date(Date.now() + 3600000).toISOString() }, { id: 'sess-3', user_id: 'user-3', expires_at: new Date(Date.now() + 3600000).toISOString() }],
      users: [{ id: 'user-1', status: 'active' }, { id: 'user-2', status: 'active' }, { id: 'user-3', status: 'active' }],
      entitlements: [{ user_id: 'user-1', plan: 'max', status: 'active' }, { user_id: 'user-2', plan: 'growth', status: 'active' }, { user_id: 'user-3', plan: 'free', status: 'active' }],
      business_rate_limits: [],
      business_profiles: [],
      keywords: [],
      competitors: [],
      reviews: [],
      calendar_items: [],
      contents: [],
      campaigns: [],
      strategies: [],
      shorts: [],
      goals: [],
      guide_done: [],
      security_runs: [],
      score_history: [],
    };
  }

  colsOf(sql, marker) {
    const m = sql.match(new RegExp(marker));
    if (!m) return [];
    return m[1].split(',').map((c) => c.trim());
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.includes('FROM sessions')) return db.tables.sessions.find((r) => r.id === params[0]) || null;
            if (sql.includes('FROM users')) return db.tables.users.find((r) => r.id === params[0] && r.status === 'active') || null;
            if (sql.includes('FROM entitlements')) return db.tables.entitlements.find((r) => r.user_id === params[0]) || null;
            if (sql.includes('FROM business_rate_limits')) return db.tables.business_rate_limits.find((r) => r.user_id === params[0] && r.endpoint === params[1] && r.window_start === params[2]) || null;
            if (sql.includes('FROM business_profiles')) return db.tables.business_profiles.find((r) => r.user_id === params[0]) || null;
            return null;
          },
          async all() {
            const m = sql.match(/FROM (\w+)/);
            const table = m ? m[1] : '';
            const rows = (db.tables[table] || []).filter((r) => r.user_id === params[0]);
            rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            return { results: rows };
          },
          async run() {
            if (sql.includes('INTO business_rate_limits')) {
              db.tables.business_rate_limits.push({ user_id: params[0], endpoint: params[1], window_start: params[2], count: params[3] });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith('UPDATE business_rate_limits')) {
              const row = db.tables.business_rate_limits.find((r) => r.user_id === params[0] && r.endpoint === params[1] && r.window_start === params[2]);
              if (row) row.count += 1;
              return { meta: { changes: row ? 1 : 0 } };
            }
            if (sql.includes('INTO business_profiles')) {
              const cols = db.colsOf(sql, /\(([^)]+)\) VALUES/);
              const row = {};
              cols.forEach((c, i) => { row[c] = params[i]; });
              const existing = db.tables.business_profiles.find((r) => r.user_id === row.user_id);
              if (existing) Object.assign(existing, row);
              else db.tables.business_profiles.push(row);
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith('INSERT INTO')) {
              const m = sql.match(/INSERT INTO (\w+)/);
              const table = m ? m[1] : '';
              const cols = db.colsOf(sql, /\(([^)]+)\) VALUES/);
              const row = {};
              cols.forEach((c, i) => { row[c] = params[i]; });
              db.tables[table].push(row);
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith('DELETE FROM')) {
              const m = sql.match(/DELETE FROM (\w+)/);
              const table = m ? m[1] : '';
              const before = db.tables[table].length;
              db.tables[table] = db.tables[table].filter((r) => !(r.id === params[0] && r.user_id === params[1]));
              return { meta: { changes: before - db.tables[table].length } };
            }
            if (sql.startsWith('UPDATE')) {
              const m = sql.match(/UPDATE (\w+)/);
              const table = m ? m[1] : '';
              const setPart = sql.match(/SET (.+) WHERE/)[1];
              const setCols = setPart.split(',').map((s) => s.trim().split(' = ')[0]);
              const id = params[setCols.length];
              const userId = params[setCols.length + 1];
              const row = db.tables[table].find((r) => r.id === id && r.user_id === userId);
              if (row) setCols.forEach((c, i) => { row[c] = params[i]; });
              return { meta: { changes: row ? 1 : 0 } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

const mockDb = new MockDb();
const env = { DB: mockDb, BUSINESS_ASSERTION_PUBLIC_KEY: JSON.stringify(publicJwk) };

async function call(path, method, token, body, origin) {
  const headers = { Origin: origin === undefined ? BUSINESS_ORIGIN : origin };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const req = new Request('https://business-api.test' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await handler.fetch(req, env);
  let data = null;
  try {
    data = await res.json();
  } catch {
  }
  return { status: res.status, data };
}

const maxToken = await makeToken('user-1', 'sess-1');
const growthToken = await makeToken('user-2', 'sess-2');
const freeToken = await makeToken('user-3', 'sess-3');

await test('worker health needs no auth', async () => {
  const r = await call('/api/health', 'GET', null, undefined);
  eq(r.status, 200, 'status');
  eq(r.data.ok, true, 'ok');
});

await test('worker rejects wrong origin', async () => {
  const r = await call('/api/keywords', 'GET', maxToken, undefined, 'https://evil.example');
  eq(r.status, 403, 'status');
});

await test('worker rejects missing token', async () => {
  const r = await call('/api/keywords', 'GET', null, undefined);
  eq(r.status, 401, 'status');
});

await test('worker rejects wrong audience assertion', async () => {
  const bad = await makeToken('user-1', 'sess-1', { aud: 'kluzar-manage-api' });
  const r = await call('/api/keywords', 'GET', bad, undefined);
  eq(r.status, 401, 'status');
});

await test('worker rejects expired assertion', async () => {
  const now = Math.floor(Date.now() / 1000);
  const expired = await makeToken('user-1', 'sess-1', { iat: now - 600, exp: now - 300 });
  const r = await call('/api/keywords', 'GET', expired, undefined);
  eq(r.status, 401, 'status');
});

await test('worker max lists keywords empty then creates one', async () => {
  const before = await call('/api/keywords', 'GET', maxToken, undefined);
  eq(before.status, 200, 'list status');
  eq(before.data.items.length, 0, 'empty');
  const created = await call('/api/keywords', 'POST', maxToken, { keyword: 'acme', group: 'brand', location: 'Worldwide', landingPage: 'https://example.com' });
  eq(created.status, 200, 'create status');
  const after = await call('/api/keywords', 'GET', maxToken, undefined);
  eq(after.data.items.length, 1, 'one item');
  eq(after.data.items[0].keyword, 'acme', 'keyword');
  eq(after.data.items[0].group, 'brand', 'group');
});

await test('worker blocks non-owner delete', async () => {
  const list = await call('/api/keywords', 'GET', maxToken, undefined);
  const id = list.data.items[0].id;
  const blocked = await call('/api/keywords/delete', 'POST', growthToken, { id });
  eq(blocked.status, 404, 'blocked status');
  const removed = await call('/api/keywords/delete', 'POST', maxToken, { id });
  eq(removed.status, 200, 'owner delete');
  eq(removed.data.deleted, true, 'deleted');
});

await test('worker growth blocked from security, max scores server-side', async () => {
  const blocked = await call('/api/security/runs', 'GET', growthToken, undefined);
  eq(blocked.status, 403, 'growth blocked');
  const saved = await call('/api/security/runs', 'POST', maxToken, { answers: { https: 'yes', headers: 'yes', exposed: 'no', updates: 'yes', forms: 'no', privacy: 'yes', backups: 'unknown', accounts: 'yes' }, score: 100 });
  eq(saved.status, 200, 'save status');
  eq(saved.data.score, 71, 'server score wins');
});

await test('worker free blocked from tools', async () => {
  const r = await call('/api/keywords', 'GET', freeToken, undefined);
  eq(r.status, 403, 'status');
});

await test('worker scan rejects private url', async () => {
  const r = await call('/api/security/scan', 'POST', maxToken, { url: 'https://192.168.1.1/' });
  eq(r.status, 400, 'status');
});

await test('worker unknown route 404 and bad create 400', async () => {
  const r = await call('/api/nope', 'GET', maxToken, undefined);
  eq(r.status, 404, 'unknown');
  const bad = await call('/api/keywords', 'POST', maxToken, { group: 'brand' });
  eq(bad.status, 400, 'missing keyword');
});

await test('worker assertion verify rejects bad signature', async () => {
  const good = await makeToken('user-1', 'sess-1');
  const parts = good.split('.');
  const tampered = parts[0] + '.' + parts[1] + '.' + Buffer.from('tampered-signature-bytes').toString('base64url');
  let threw = false;
  try {
    await verifyAssertion(tampered, publicJwk, Math.floor(Date.now() / 1000));
  } catch {
    threw = true;
  }
  eq(threw, true, 'threw');
});

console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exitCode = 1;
