const initSqlJs = require('sql.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function openStore(file, legacyFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const isNew = !fs.existsSync(file);
  const SQL = await initSqlJs({ locateFile: (name) => require.resolve(`sql.js/dist/${name}`) });
  const db = isNew ? new SQL.Database() : new SQL.Database(new Uint8Array(fs.readFileSync(file)));
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY,
      at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
      salt BLOB NOT NULL,
      password_hash BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS migration_state (
      key TEXT PRIMARY KEY
    );
  `);

  const persist = () => {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, Buffer.from(db.export()));
    fs.renameSync(tmp, file);
  };
  const rows = (sql, params = []) => {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      const result = [];
      while (statement.step()) result.push(statement.getAsObject());
      return result;
    } finally {
      statement.free();
    }
  };

  let migratedLegacy = false;
  if (legacyFile && fs.existsSync(legacyFile) && !rows('SELECT key FROM migration_state WHERE key = ?', ['legacy-json'])[0]) {
    const legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
    if (!legacy || !Array.isArray(legacy.reports) || !Array.isArray(legacy.audit)) {
      db.close();
      throw new Error(`Invalid legacy authority database: ${legacyFile}`);
    }
    try {
      db.run('BEGIN');
      for (const r of legacy.reports) {
        db.run('INSERT OR IGNORE INTO reports (id, state, created_at, approved_at, data) VALUES (?, ?, ?, ?, ?)',
          [r.id, r.state, r.createdAt, r.approvedAt || null, JSON.stringify(r)]);
      }
      for (const a of legacy.audit) {
        db.run('INSERT INTO audit (at, data) VALUES (?, ?)', [a.at, JSON.stringify(a)]);
      }
      db.run('INSERT INTO migration_state (key) VALUES (?)', ['legacy-json']);
      db.run('COMMIT');
      migratedLegacy = true;
    } catch (error) {
      db.run('ROLLBACK');
      db.close();
      throw error;
    }
  }
  if (isNew || migratedLegacy) persist();

  return {
    addReport(r) {
      db.run('INSERT INTO reports (id, state, created_at, approved_at, data) VALUES (?, ?, ?, ?, ?)',
        [r.id, r.state, r.createdAt, r.approvedAt || null, JSON.stringify(r)]);
      persist();
      return r;
    },
    getReport: (id) => {
      const row = rows('SELECT data FROM reports WHERE id = ?', [id])[0];
      return row ? JSON.parse(row.data) : undefined;
    },
    listReports: (state) => (state
      ? rows('SELECT data FROM reports WHERE state = ? ORDER BY created_at DESC', [state])
      : rows('SELECT data FROM reports ORDER BY created_at DESC')).map((row) => JSON.parse(row.data)),
    saveReport(r) {
      db.run('UPDATE reports SET state = ?, created_at = ?, approved_at = ?, data = ? WHERE id = ?',
        [r.state, r.createdAt, r.approvedAt || null, JSON.stringify(r), r.id]);
      persist();
    },
    audit(actor, action, reportId, detail) {
      const entry = { at: new Date().toISOString(), actor, action, reportId, detail: detail || null };
      db.run('INSERT INTO audit (at, data) VALUES (?, ?)', [entry.at, JSON.stringify(entry)]);
      persist();
    },
    listAudit: () => rows('SELECT data FROM audit ORDER BY id').map((row) => JSON.parse(row.data)),
    ensureUser(username, role, password) {
      const salt = crypto.randomBytes(16);
      const hash = crypto.scryptSync(password, salt, 64);
      db.run(`INSERT INTO users (username, role, salt, password_hash) VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET role = excluded.role, salt = excluded.salt, password_hash = excluded.password_hash`,
      [username, role, salt, hash]);
      persist();
    },
    getUser(username) {
      const row = rows('SELECT username, role, salt, password_hash FROM users WHERE username = ?', [username])[0];
      return row ? { username: row.username, role: row.role, salt: row.salt, passwordHash: row.password_hash } : undefined;
    },
    close: () => db.close(),
  };
}

module.exports = { openStore };
