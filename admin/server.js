// CityPulse Authority server (separate from the public dashboard server). Zero dependencies, Node 18+. Owner: T1 (backend), T4 (pages).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const W = require('./workflow'), { openStore } = require('./store');
try { for (const l of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !l.trim().startsWith('#') && !(m[1] in process.env)) process.env[m[1]] = m[2]; } } catch {}

function createServer(opts = {}) {
  const env = { ADMIN_USER: process.env.ADMIN_USER, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, ...opts };
  const store = openStore(opts.dbFile || process.env.ADMIN_DB || path.join(__dirname, 'data', 'db.json'));
  const sessions = new Map(), hits = new Map();
  const limited = (key, max, windowMs) => { const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < windowMs); a.push(now); hits.set(key, a); return a.length > max; };
  const safeEq = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
  const send = (res, code, body, extra = {}) => { res.writeHead(code, { 'Content-Type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/json', 'Cache-Control': 'no-store', ...extra }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  const pub = { 'Access-Control-Allow-Origin': '*' };
  const readBody = (req) => new Promise((ok, bad) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 20000) { bad(new Error('Body too large')); req.destroy(); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch { bad(new Error('Invalid JSON')); } }); });
  const actor = (req) => { const t = (req.headers.authorization || '').replace(/^Bearer /, ''), s = sessions.get(t); return s && s.exp > Date.now() ? s : null; };
  const ip = (req) => req.socket.remoteAddress || 'unknown';

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), p = u.pathname, m = req.method;
    try {
      if (m === 'OPTIONS') { res.writeHead(204, { ...pub, 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
      if (m === 'GET' && (p === '/' || p === '/report')) return send(res, 200, fs.readFileSync(path.join(__dirname, 'report.html'), 'utf8'));
      if (m === 'GET' && p === '/admin') return send(res, 200, fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8'));
      if (m === 'GET' && p === '/api/health') return send(res, 200, { ok: true, adminConfigured: !!(env.ADMIN_USER && env.ADMIN_PASSWORD) }, pub);

      // ---- public ----
      if (m === 'GET' && p === '/api/public/notices') {
        const now = Date.now(), notices = store.listReports('approved').filter((r) => W.isPublic(r, now)).map(W.toPublic);
        return send(res, 200, { fetchedAt: now, source: 'CityPulse Authority server (simulated authority role)', notices }, pub);
      }
      if (m === 'POST' && p === '/api/reports') {
        if (limited('rep:' + ip(req), 5, 3600000)) return send(res, 429, { error: 'Too many reports from this address; try again later' }, pub);
        const { errors, value } = W.validateSubmission(await readBody(req));
        if (errors.length) return send(res, 400, { errors }, pub);
        const r = store.addReport({ id: crypto.randomUUID().slice(0, 8), ...value, state: 'submitted', createdAt: new Date().toISOString(), reviewer: null, reviewNote: null, approvedAt: null });
        store.audit('public', 'submitted', r.id, { type: r.type, category: r.category });
        return send(res, 201, { id: r.id, state: r.state, message: 'Submitted for authority review. It is not public until approved.' }, pub);
      }

      // ---- admin ----
      if (m === 'POST' && p === '/api/admin/login') {
        if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return send(res, 503, { error: 'ADMIN_USER / ADMIN_PASSWORD not configured (see .env.example)' });
        if (limited('login:' + ip(req), 10, 900000)) return send(res, 429, { error: 'Too many login attempts' });
        const b = await readBody(req);
        if (!(safeEq(b.username, env.ADMIN_USER) && safeEq(b.password, env.ADMIN_PASSWORD))) { store.audit('unknown', 'login_failed', null, null); return send(res, 401, { error: 'Invalid credentials' }); }
        const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { user: env.ADMIN_USER, role: 'admin', exp: Date.now() + 8 * 3600000 });
        store.audit(env.ADMIN_USER, 'login', null, null); return send(res, 200, { token, role: 'admin', expiresInHours: 8 });
      }
      if (p.startsWith('/api/admin/')) {
        const a = actor(req); if (!a) return send(res, 401, { error: 'Login required' });
        if (m === 'GET' && p === '/api/admin/reports') return send(res, 200, { reports: store.listReports(u.searchParams.get('state')).sort((x, y) => y.createdAt.localeCompare(x.createdAt)) });
        if (m === 'GET' && p === '/api/admin/audit') return send(res, 200, { audit: store.listAudit() });
        const d = p.match(/^\/api\/admin\/reports\/([\w-]+)\/(decision|close)$/);
        if (m === 'POST' && d) {
          const r = store.getReport(d[1]); if (!r) return send(res, 404, { error: 'Report not found' });
          const b = await readBody(req), note = String(b.note || '').slice(0, 500);
          if (d[2] === 'decision') {
            const to = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested', review: 'under_review' }[b.decision];
            if (!to) return send(res, 400, { error: 'decision must be approve, reject, request_changes or review' });
            if (!W.canTransition(r.state, to)) return send(res, 409, { error: `Cannot go from ${r.state} to ${to}` });
            if (to === 'approved') {
              if (r.type === 'planned_work' && b.permitVerified !== true) return send(res, 400, { error: 'Reviewer must confirm the permit was checked (permitVerified: true)' });
              if (b.activeFrom) r.activeFrom = new Date(b.activeFrom).toISOString();
              if (b.activeUntil) r.activeUntil = new Date(b.activeUntil).toISOString();
              if (b.alternative != null) r.alternative = String(b.alternative).slice(0, 200);
              if (!r.activeUntil) { r.activeUntil = new Date(Date.now() + 24 * 3600000).toISOString(); } // incidents/advisories expire in 24h unless set
              r.approvedAt = new Date().toISOString();
            }
            r.state = to; r.reviewer = a.user; r.reviewNote = note; store.save(); store.audit(a.user, b.decision, r.id, { note });
            return send(res, 200, { id: r.id, state: r.state });
          }
          const to = { resolve: 'resolved', cancel: 'cancelled' }[b.action];
          if (!to) return send(res, 400, { error: 'action must be resolve or cancel' });
          if (!W.canTransition(r.state, to)) return send(res, 409, { error: `Cannot go from ${r.state} to ${to}` });
          r.state = to; r.reviewNote = note || r.reviewNote; store.save(); store.audit(a.user, b.action, r.id, { note });
          return send(res, 200, { id: r.id, state: r.state });
        }
      }
      send(res, 404, { error: 'Not found' });
    } catch (e) { send(res, /large|JSON/.test(e.message) ? 400 : 500, { error: e.message }, pub); }
  });
  return server;
}
if (require.main === module) { const port = +process.env.ADMIN_PORT || 4000; createServer().listen(port, () => console.log(`CityPulse Authority server on http://localhost:${port}  (report form: /  admin: /admin)`)); }
module.exports = { createServer };
