# CityPulse Team Plan v2 (includes the Authority layer)

## Rules
- One branch per person: `t1-data`, `t2-metrics`, `t3-sim`, `t4-qa`. Only the lead merges to `main` via pull request. CI (`npm test`) must be green.
- Edit only files you own (see ownership map in `docs/ARCHITECTURE.md`); ask the owner before touching others.
- Never show a value that is not from a provider, a documented formula, an authority-approved notice, or a labelled scenario.
- Reading format is fixed: `metric, value, unit, location, source, observedAt, fetchedAt, dataType, status`.
- Daily 15-min stand-up. Feature freeze 3 days before review. Evidence (logs, tool output) is committed in `docs/evidence/`.

## First-day setup (everyone)
```bash
git clone <repo> && cd citypulse
cp .env.example .env     # T1: add TOMTOM_API_KEY; set ADMIN_USER / ADMIN_PASSWORD (no default)
npm install && npm test
node server.js           # dashboard + traffic proxy  http://localhost:3000
node admin/server.js     # authority server           http://localhost:4000  (report form /, console /admin)
git checkout -b t1-data  # your own branch
```

## Lead — integrator
| Day | Task | Output |
|---|---|---|
| 1 | Deploy `server.js` + `admin/server.js` on an always-on machine so logging runs 24/7 (logger already built: `logs/fetch-log.jsonl`) | URLs, logs accumulating |
| 1 | Push repo, enable branch protection + CI | green `main` |
| 2-4 | Trust score (freshness, source type, completeness) in the data layer; document formula | score on every reading |
| 3-5 | Extend `/api/log` to also record metric values (needed by T3) | values in log |
| 5-10 | Review/merge daily; resolve conflicts in `project_citypulse.html` | clean `main` |
| 11-13 | Freeze, run full demo 3×, tag release | final build |

## T1 — Data + Authority backend
| Days | Task | Output |
|---|---|---|
| 1-2 | TomTom key; verify every corridor "Matched at"; fix `config.json`; confirm incidents call returns 200 (fix `fields` if 400) | screenshots, fixes |
| 2-5 | Find a **sensor** air-quality source for Chennai (OpenAQ → CPCB); add as provider with data type `sensor`, shown beside CAMS | provider or documented search |
| 3-6 | Investigate Chennai transit/open data (Metro, MTC, data.gov.in, GCC) | feed or finding with URLs/dates |
| 2-7 | Authority backend: SQLite instead of `db.json`, roles (admin/viewer), scrypt password hashing, workflow-metrics endpoint for T2 (`docs/AUTHORITY_SPEC.md` backlog 1,2,6) | upgraded `admin/` + tests |
| 7-10 | Analyse log with `node scripts/log-summary.js`: uptime, latency, failure causes | table for T2/T3/report |
**Done when:** every source in `DATA_SOURCES.md` has a recorded real test; authority tests green.

## T2 — Software Metrics + System Quality
| Days | Task | Output |
|---|---|---|
| 1-3 | Complete `docs/gqm-plan.md` | GQM plan |
| 2-4 | Code metrics (LOC, cyclomatic complexity per function, comment ratio, duplication) with tools; save output | metrics table + evidence |
| 3-7 | **System Quality** dashboard section: % live/stale/unavailable, provider uptime (from log), trust scores, authority workflow metrics (time-to-approve, approval rate) | new section |
| 3-8 | Raise coverage toward 80%+, keep a defect log | coverage report, defect log |
| 8-10 | Write `docs/metrics-report.md` | 4-6 page report |
**Done when:** every number traces to a tool run or log.

## T3 — Simulator validation + Analytics
| Days | Task | Output |
|---|---|---|
| 1-3 | Design evaluation (pairing rule, MAE) | one-page method |
| 3-6 | Implement `scripts/evaluate-simulator.js` (starter provided) once values are logged | working script |
| 4-9 | Run on collected data incl. real rain events; report n, MAE, bias | error figures |
| 8-10 | Refit coefficients; before/after error; optional: authority-approved closure as a scenario input | updated simulator |
| 6-10 | Analytics: longer-interval change, rain vs congestion correlation, richer reports | updated sections |
**Done when:** simulator page states a measured error (with n) instead of "not validated".

## T4 — Frontend, authority UI, QA, presentation
| Days | Task | Output |
|---|---|---|
| 1-4 | Browser/mobile/offline/slow-network testing (`docs/browser-test-report.md`); send bugs to owners | bug list + screenshots |
| 2-6 | Polish `admin/report.html` and `admin/admin.html` (layout, validation messages, accessibility) and the Authority notices panels | improved UI |
| 3-6 | Accessibility pass: contrast, keyboard, labels | fixes + short report |
| 5-8 | Update team PowerPoint with `docs/ARCHITECTURE.md` diagram, data-class slide, results slides | updated PPT |
| 6-10 | `docs/demo-script.md` (incl. authority flow + failure demo) and `docs/qa-sheet.md` | scripts |
| 11-13 | Two full rehearsals with the whole team | timed runs |

## Authority-layer flow to demo
Citizen submits planned work (permit ref) → authority console: reviewer checks permit, approves → dashboard shows notice with reason + alternative route + alert → expires automatically. Slow traffic without a report stays "Heavy traffic — no incident reported"; "Accident" only from TomTom or an approved report.

## Dependencies
Everyone needs the deployed logger (day 1). T3 needs values logged (~day 5) and ~1 week of data. T2's quality page needs log data (~day 7). T4's results slides need T2/T3 output (~day 10).

## Risks
No Chennai sensor feed (document the search) · too few rain events (report n, don't overclaim) · merge clashes in the single HTML file (small PRs, merge daily) · authority role is simulated (say so) · never commit `.env`.
