// Uptime / latency per source from logs/fetch-log.jsonl.  Usage: node scripts/log-summary.js [file]   Owner: T1 (analysis), T2 (quality metrics)
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'logs', 'fetch-log.jsonl');
if (!fs.existsSync(file)) { console.error('No log file yet: ' + file + ' (run the dashboard with the backend running)'); process.exit(1); }
const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const by = {};
rows.filter((r) => r.origin === 'dashboard').forEach((r) => { (by[r.source] = by[r.source] || []).push(r); });
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
console.log('source        fetches  success%  p50 ms  p95 ms  first → last');
Object.entries(by).forEach(([src, a]) => {
  const ok = a.filter((r) => r.ok).length, ms = a.filter((r) => r.ok && r.ms != null).map((r) => r.ms);
  console.log(src.padEnd(13), String(a.length).padStart(7), (100 * ok / a.length).toFixed(1).padStart(9), String(pct(ms, .5) ?? '-').padStart(7), String(pct(ms, .95) ?? '-').padStart(7), ' ', a[0].at, '→', a[a.length - 1].at);
});
const errs = {}; rows.filter((r) => !r.ok && r.error).forEach((r) => { const k = r.source + ': ' + r.error; errs[k] = (errs[k] || 0) + 1; });
console.log('\nTop failure causes:'); Object.entries(errs).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(' ', v, k));
