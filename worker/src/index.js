import { authenticate, checkRateLimit, corsHeaders, jsonResponse, planGate, readJson } from './verify.js';
import { securityScore, SECURITY_CHECKS } from './checks.js';
import { runScan, validateTargetUrl } from './scan.js';

function cleanString(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function cleanInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function cleanBool(v) {
  return v === true;
}

function cleanList(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 10);
}

const S = (max) => ({ kind: 'string', max });
const I = (min, max) => ({ kind: 'int', min, max });
const B = { kind: 'bool' };
const L = { kind: 'list' };

const COLLECTIONS = {
  keywords: { table: 'keywords', fields: { keyword: S(200), group: S(100), location: S(100), landingPage: S(2048) }, required: ['keyword'] },
  competitors: { table: 'competitors', fields: { name: S(200), category: S(100), rating: S(20), reviewCount: S(20), website: S(2048), notes: S(2000) }, required: ['name'] },
  reviews: { table: 'reviews', fields: { platform: S(50), author: S(200), rating: I(1, 5), text: S(5000), date: S(20), replied: B, replyDraft: S(5000) }, required: ['text'] },
  calendar: { table: 'calendar_items', fields: { title: S(200), platform: S(50), type: S(50), status: S(20), date: S(20), campaign: S(200), notes: S(2000) }, required: ['title'] },
  contents: { table: 'contents', fields: { title: S(200), caption: S(5000), hashtags: S(1000), platform: S(50), type: S(50), template: B, campaign: S(200) }, required: ['title'] },
  campaigns: { table: 'campaigns', fields: { name: S(200), objective: S(1000), startDate: S(20), endDate: S(20), platforms: L }, required: ['name'] },
  strategies: { table: 'strategies', fields: { name: S(200), objective: S(1000), audience: S(500), platforms: L, pillars: S(2000), frequency: S(20), duration: S(100), notes: S(2000) }, required: ['name'] },
  shorts: { table: 'shorts', fields: { title: S(200), topic: S(100), status: S(20), date: S(20), hashtags: S(1000), notes: S(2000) }, required: ['title'] },
  goals: { table: 'goals', fields: { title: S(200), metric: S(50), target: S(100), deadline: S(20), done: B }, required: ['title'] },
  guideDone: { table: 'guide_done', fields: { recId: S(100) }, required: ['recId'] },
  scoreHistory: { table: 'score_history', fields: { overall: I(0, 100), profile: I(0, 100), consistency: I(0, 100), guide: I(0, 100) }, required: [] },
  connections: { table: 'connections', fields: { platform: S(50), handle: S(200), url: S(2048), connectedOn: S(20), notes: S(2000) }, required: ['platform'] },
  socialFigures: { table: 'social_figures', fields: { platform: S(50), date: S(20), followers: S(20), reach: S(20), impressions: S(20), engagement: S(20) }, required: ['platform'] },
};

for (const name of Object.keys(COLLECTIONS)) COLLECTIONS[name].name = name;

const COLUMN_MAP = { keywords: { group: 'group_name' } };

function dbCol(collName, key) {
  return (COLUMN_MAP[collName] && COLUMN_MAP[collName][key]) || key;
}

const PROFILE_FIELDS = { businessName: S(200), industry: S(100), businessType: S(100), website: S(2048), category: S(100), description: S(2000), address: S(500), phone: S(100), hours: S(200), targetAudience: S(500), locations: S(500), objectives: L, platforms: L, priorities: S(2000), services: S(2000), photosCount: S(20) };

function pickFields(spec, body) {
  const out = {};
  for (const key of Object.keys(spec)) {
    const rule = spec[key];
    if (rule.kind === 'string') out[key] = cleanString(body[key], rule.max);
    if (rule.kind === 'int') out[key] = body[key] === null || body[key] === undefined ? null : cleanInt(body[key], rule.min, rule.max);
    if (rule.kind === 'bool') out[key] = cleanBool(body[key]);
    if (rule.kind === 'list') out[key] = cleanList(body[key]);
  }
  return out;
}

function toDbValue(v) {
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function fromDbRow(row, spec) {
  const out = { ...row };
  for (const key of Object.keys(spec)) {
    if (spec[key].kind === 'list' && typeof out[key] === 'string') {
      try {
        out[key] = JSON.parse(out[key]);
      } catch {
        out[key] = [];
      }
    }
    if (spec[key].kind === 'bool' && typeof out[key] === 'number') out[key] = out[key] === 1;
  }
  if (out.group_name !== undefined) {
    out.group = out.group_name;
    delete out.group_name;
  }
  return out;
}

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

async function listCollection(env, auth, coll) {
  const res = await env.DB.prepare('SELECT * FROM ' + coll.table + ' WHERE user_id = ? ORDER BY created_at DESC').bind(auth.userId).all();
  const rows = (res && res.results) || [];
  return { ok: true, items: rows.map((r) => fromDbRow(r, coll.fields)) };
}

async function createCollection(env, auth, coll, body) {
  const picked = pickFields(coll.fields, body);
  for (const req of coll.required) {
    if (picked[req] === '' || picked[req] === null || picked[req] === undefined) fail(400, 'Required fields are missing.');
  }
  if (coll === COLLECTIONS.scoreHistory) {
    if (picked.overall === null || picked.profile === null || picked.guide === null) fail(400, 'Required fields are missing.');
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const cols = ['id', 'user_id', ...Object.keys(coll.fields).map((k) => dbCol(coll.name, k)), 'created_at'];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [id, auth.userId, ...Object.keys(coll.fields).map((k) => toDbValue(picked[k])), createdAt];
  await env.DB.prepare('INSERT INTO ' + coll.table + ' (' + cols.join(', ') + ') VALUES (' + placeholders + ')').bind(...values).run();
  return { ok: true, id };
}

async function deleteCollection(env, auth, coll, body) {
  if (typeof body.id !== 'string' || body.id.length === 0) fail(400, 'Invalid request.');
  const res = await env.DB.prepare('DELETE FROM ' + coll.table + ' WHERE id = ? AND user_id = ?').bind(body.id, auth.userId).run();
  const changes = res && res.meta ? res.meta.changes : 0;
  if (!changes) fail(404, 'Not found.');
  return { ok: true, deleted: true };
}

async function updateCollection(env, auth, coll, body) {
  if (typeof body.id !== 'string' || body.id.length === 0) fail(400, 'Invalid request.');
  const picked = pickFields(coll.fields, body);
  const keys = Object.keys(picked).filter((k) => body[k] !== undefined);
  if (keys.length === 0) fail(400, 'Invalid request.');
  const setClause = keys.map((k) => dbCol(coll.name, k) + ' = ?').join(', ');
  const values = keys.map((k) => toDbValue(picked[k]));
  const res = await env.DB.prepare('UPDATE ' + coll.table + ' SET ' + setClause + ' WHERE id = ? AND user_id = ?').bind(...values, body.id, auth.userId).run();
  const changes = res && res.meta ? res.meta.changes : 0;
  if (!changes) fail(404, 'Not found.');
  return { ok: true, updated: true };
}

async function getProfile(env, auth) {
  const row = await env.DB.prepare('SELECT * FROM business_profiles WHERE user_id = ?').bind(auth.userId).first();
  return { ok: true, profile: row ? fromDbRow(row, PROFILE_FIELDS) : null };
}

async function saveProfile(env, auth, body) {
  const picked = pickFields(PROFILE_FIELDS, body);
  const updatedAt = new Date().toISOString();
  const cols = ['user_id', ...Object.keys(PROFILE_FIELDS), 'updated_at'];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [auth.userId, ...Object.keys(PROFILE_FIELDS).map((k) => toDbValue(picked[k])), updatedAt];
  const updates = Object.keys(PROFILE_FIELDS).map((k) => k + ' = excluded.' + k).join(', ') + ', updated_at = excluded.updated_at';
  await env.DB.prepare('INSERT INTO business_profiles (' + cols.join(', ') + ') VALUES (' + placeholders + ') ON CONFLICT(user_id) DO UPDATE SET ' + updates).bind(...values).run();
  return { ok: true };
}

async function listSecurityRuns(env, auth) {
  const res = await env.DB.prepare('SELECT * FROM security_runs WHERE user_id = ? ORDER BY created_at DESC').bind(auth.userId).all();
  const rows = (res && res.results) || [];
  return { ok: true, items: rows.map((r) => ({ ...r, answers: JSON.parse(r.answers) })) };
}

async function saveSecurityRun(env, auth, body) {
  const raw = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const answers = {};
  for (const check of SECURITY_CHECKS) {
    if (raw[check.id] === 'yes' || raw[check.id] === 'no' || raw[check.id] === 'unknown') answers[check.id] = raw[check.id];
  }
  const score = securityScore(answers);
  if (score === null) fail(400, 'Answer at least one checklist question.');
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO security_runs (id, user_id, answers, score, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, auth.userId, JSON.stringify(answers), score, new Date().toISOString()).run();
  return { ok: true, score };
}

function routeFor(pathname) {
  if (pathname === '/api/profile') return { kind: 'profile' };
  if (pathname === '/api/security/scan') return { kind: 'scan' };
  if (pathname === '/api/security/runs') return { kind: 'securityRuns' };
  const del = pathname.match(/^\/api\/([a-zA-Z]+)\/delete$/);
  if (del && COLLECTIONS[del[1]]) return { kind: 'delete', coll: COLLECTIONS[del[1]] };
  const upd = pathname.match(/^\/api\/([a-zA-Z]+)\/update$/);
  if (upd && COLLECTIONS[upd[1]]) return { kind: 'update', coll: COLLECTIONS[upd[1]] };
  const one = pathname.match(/^\/api\/([a-zA-Z]+)$/);
  if (one && COLLECTIONS[one[1]]) return { kind: 'collection', coll: COLLECTIONS[one[1]] };
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, origin);
      return jsonResponse({ ok: true, service: 'kluzar-business-api', version: '1' }, 200, origin);
    }
    const r = routeFor(url.pathname);
    if (!r) return jsonResponse({ ok: false, error: 'Not found.' }, 404, origin);
    let auth;
    try {
      auth = await authenticate(request, env);
    } catch (e) {
      return jsonResponse({ ok: false, error: e.message || 'Sign-in required.' }, e.status || 401, origin);
    }
    try {
      if (request.method === 'POST') {
        const allowedWrite = await checkRateLimit(env.DB, auth.userId, 'write', 600, 3600);
        if (!allowedWrite) fail(429, 'Too many requests. Try again later.');
      }
      if (r.kind === 'profile') {
        if (!planGate(auth, false)) fail(403, 'This section needs Growth or Max.');
        if (request.method === 'GET') return jsonResponse(await getProfile(env, auth), 200, origin);
        if (request.method === 'POST') {
          const body = await readJson(request);
          if (!body) fail(400, 'Invalid request.');
          return jsonResponse(await saveProfile(env, auth, body), 200, origin);
        }
        fail(405, 'Method not allowed.');
      }
      if (r.kind === 'securityRuns') {
        if (!planGate(auth, true)) fail(403, 'This section needs Max.');
        if (request.method === 'GET') return jsonResponse(await listSecurityRuns(env, auth), 200, origin);
        if (request.method === 'POST') {
          const body = await readJson(request);
          if (!body) fail(400, 'Invalid request.');
          return jsonResponse(await saveSecurityRun(env, auth, body), 200, origin);
        }
        fail(405, 'Method not allowed.');
      }
      if (r.kind === 'scan') {
        if (!planGate(auth, true)) fail(403, 'This section needs Max.');
        if (request.method !== 'POST') fail(405, 'Method not allowed.');
        const body = await readJson(request);
        if (!body) fail(400, 'Invalid request.');
        const allowedScan = await checkRateLimit(env.DB, auth.userId, 'scan', 20, 3600);
        if (!allowedScan) fail(429, 'Too many scans. Try again later.');
        const check = validateTargetUrl(body.url);
        if (!check.ok) fail(400, check.reason);
        const scan = await runScan(check.url.toString());
        if (!scan.ok) fail(400, scan.reason);
        return jsonResponse({ ok: true, scan }, 200, origin);
      }
      if (!planGate(auth, false)) fail(403, 'This section needs Growth or Max.');
      if (r.kind === 'collection' && request.method === 'GET') return jsonResponse(await listCollection(env, auth, r.coll), 200, origin);
      if (r.kind === 'collection' && request.method === 'POST') {
        const body = await readJson(request);
        if (!body) fail(400, 'Invalid request.');
        return jsonResponse(await createCollection(env, auth, r.coll, body), 200, origin);
      }
      if (r.kind === 'delete' && request.method === 'POST') {
        const body = await readJson(request);
        if (!body) fail(400, 'Invalid request.');
        return jsonResponse(await deleteCollection(env, auth, r.coll, body), 200, origin);
      }
      if (r.kind === 'update' && request.method === 'POST') {
        const body = await readJson(request);
        if (!body) fail(400, 'Invalid request.');
        return jsonResponse(await updateCollection(env, auth, r.coll, body), 200, origin);
      }
      fail(405, 'Method not allowed.');
    } catch (e) {
      if (e.status) return jsonResponse({ ok: false, error: e.message }, e.status, origin);
      return jsonResponse({ ok: false, error: 'Request failed.' }, 500, origin);
    }
  },
};
