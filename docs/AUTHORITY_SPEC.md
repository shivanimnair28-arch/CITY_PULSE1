# Authority layer — specification

**Purpose:** let the public submit reports, let an authority review them, and publish only approved, time-limited notices. The authority can approve, reject, annotate and publish; it can **never overwrite a live sensor/provider value**. Every action is audit-logged. The authority role is **simulated** (test admin account) for the review.

## Report record
`id, type, category, title, description, road, area, lat, lon, activeFrom, activeUntil, alternative, permitRef (planned_work only), state, createdAt, reviewer, reviewNote, approvedAt`

- **type:** `incident` | `planned_work` | `advisory`
- **category:** incident → accident, heavy_traffic, flooding, road_damage, streetlight, water, other · planned_work → road_construction, utility_work, maintenance, event · advisory → general

## State machine
`submitted → (under_review) → approved | rejected | changes_requested` · `changes_requested → submitted | rejected` · `approved → resolved | cancelled`
"Active/expired" is derived from `activeFrom/activeUntil`; approved incidents without an end default to 24 h.

## API
| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/reports` | public | anonymous; honeypot; 5/hour/IP; no personal data stored |
| `GET /api/public/notices` | public | approved + active only; hides permitRef, notes, reviewer |
| `POST /api/admin/login` | — | refused (503) unless ADMIN_USER/ADMIN_PASSWORD set; optional VIEWER_USER/VIEWER_PASSWORD; passwords are scrypt-hashed in SQLite; 10 tries/15 min |
| `GET /api/admin/reports?state=` | admin, viewer | |
| `POST /api/admin/reports/:id/decision` | admin | `decision`: approve/reject/request_changes/review; planned_work approval needs `permitVerified:true` |
| `POST /api/admin/reports/:id/close` | admin | `action`: resolve/cancel |
| `GET /api/admin/audit` | admin, viewer | |
| `GET /api/admin/workflow-metrics` | admin, viewer | approval rate and mean time-to-approve, each with its sample size |

`approvalRate` is approved reports divided by approved + rejected reports; `averageTimeToApproveMs` is the mean of `approvedAt - createdAt` for successfully approved reports. Sample counts are returned separately; rates/times are `null` when the corresponding sample is empty.

## Rules / honesty
- The permit reference is free text checked **by a human**; the system does not verify it against any government database.
- No camera analysis is performed; the reviewer may use camera views outside the system. Do not store faces/number plates.
- Public pages label content "Authority-verified (simulated role)".

## Backlog (T1/T4, in priority order)
1. ~~SQLite instead of `db.json`~~  2. ~~Viewer vs admin roles, password hashing (scrypt)~~  3. Photo attachment (size/type checked)  4. CAPTCHA  5. Notices as optional simulator input ("apply this closure")  6. ~~Workflow metrics endpoint for T2 (time-to-approve, approval rate)~~

The server stores new data in `admin/data/authority.sqlite` and migrates the existing `admin/data/db.json` on first startup. The authority console currently shows review controls to any logged-in account; API authorization remains authoritative, so viewer accounts receive `403` for write requests. The UI should hide those controls for viewers.
