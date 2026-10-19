// Minimal JSON-file store (zero dependencies). Owner: T1 — upgrade to SQLite when time allows.
const fs = require('fs'), path = require('path');
function openStore(file) {
  let db = { reports: [], audit: [] };
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const save = () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db, null, 2)); fs.renameSync(file + '.tmp', file); };
  return {
    addReport(r) { db.reports.push(r); save(); return r; },
    getReport: (id) => db.reports.find((r) => r.id === id),
    listReports: (state) => db.reports.filter((r) => !state || r.state === state),
    audit(actor, action, reportId, detail) { db.audit.push({ at: new Date().toISOString(), actor, action, reportId, detail: detail || null }); save(); },
    listAudit: () => db.audit.slice(),
    save,
  };
}
module.exports = { openStore };
