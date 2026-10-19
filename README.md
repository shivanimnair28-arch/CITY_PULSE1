# CityPulse — Live-Data Smart City Dashboard (Chennai)

Software Metrics project. The original nine-section prototype is preserved; every random-number generator was removed and the dashboard now runs on a shared live-data layer.

## Architecture
```
Browser (project_citypulse.html)                       Node backend (server.js, no deps)
 ├─ Shared data layer: store + 3 pollers  ──────────▶  /api/traffic  ──▶ TomTom Flow + Incidents (key in .env)
 │   normalise → validate → readings{metric,value,    /api/config, /api/health
 │   unit,location,source,observedAt,fetchedAt,
 │   dataType,status}
 ├─ Open-Meteo Forecast API  (direct, no key)
 └─ Open-Meteo Air Quality API / CAMS (direct, no key)
```
Weather and air quality are called from the browser (no key, CORS enabled). Traffic goes through the backend so the TomTom key never reaches browser code.

## Authority layer (new)
A separate server (`admin/server.js`, port 4000) lets citizens submit anonymous reports (incidents, planned works with a permit reference, advisories). An authority officer reviews them in `/admin`; only **approved, time-limited** notices are exposed at `/api/public/notices` and shown on the dashboard as *Authority-verified* (never mixed with sensor/provider data). A slow-down alone is labelled "Heavy traffic — no incident reported"; "accident" appears only when TomTom or an approved report says so. The authority role is simulated; the permit reference is checked by a human. See `docs/AUTHORITY_SPEC.md` and `docs/ARCHITECTURE.md`.

## Setup
```bash
cp .env.example .env        # add TOMTOM_API_KEY (free key: developer.tomtom.com)
node server.js              # Node 18+, dashboard at http://localhost:3000
node admin/server.js        # authority server http://localhost:4000 (needs ADMIN_USER/ADMIN_PASSWORD in .env)
npm install && npm test     # fixture-based tests (jsdom)
```
Without a key the dashboard still runs: weather and air quality are live; traffic, incidents and infrastructure show **Unavailable** with the reason. Opening the HTML file directly (file://) also works and talks to `http://localhost:3000` for traffic.

## Configuration
`config.json` holds the city (name, lat/lon, timezone), zones, corridor sample points, refresh intervals and enabled sources. The Settings page overrides city/intervals/sources per browser (localStorage). Zone and corridor coordinates are **approximate sample points**; TomTom snaps each to the nearest road segment and the Mobility table shows the matched position so you can check it.

## Refresh behaviour
One `setTimeout` chain per source (no duplicate timers), no overlapping requests, 12–20 s timeouts. Defaults: weather 600 s, air quality 900 s, traffic 300 s (server also caches traffic 120 s; 6 TomTom calls per cycle ≈ 1,700/day at 300 s). On failure: retry with exponential backoff (15 s, 30 s, 60 s … capped at the interval; ≥ 60 s after HTTP 429). The last good reading is kept but labelled **stale** with its original observation time. Nothing is ever replaced by generated values. Manual **Refresh** re-runs all sources.

## Metric classification
| Class | Examples |
|---|---|
| Provider-reported | US AQI value, incident counts, per-segment current/free-flow speed |
| Model-based current estimate | Open-Meteo temperature/humidity/wind/rain; CAMS PM2.5/PM10/O₃/NO₂ |
| Derived | Congestion % = (1 − current ÷ free-flow) × 100; mean speed; corridor labels (<20 free-flow, 20–40 moderate, ≥40 heavy) |
| Scenario projection | Everything in the What-If Simulator |
| Unavailable | Noise, crowd density, transit counts/status, events, utilities, asset health |

No AQI is computed from PM concentrations; the dashboard shows only the AQI Open-Meteo reports (US scale). **No ground-sensor feed (OpenAQ/CPCB) is connected, so nothing is labelled a sensor observation.**

## What-If Simulator
Baseline = latest live readings for the selected zone (nearest monitored corridor if mapped, else city-wide mean of sampled segments; zone PM2.5 from the model grid). Formulas and parameters are shown in the UI:
- Road closure `c′ = c + (100−c)·0.30`; Heavy rain `·0.20` and PM2.5 ×0.85; Festival `·0.35`; Improved transit `c′ = c·(1−0.08)`
- Speed `v′ = free-flow·(1−c′/100)` (floor 5 km/h); 10 km trip time = 600/v min; PM2.5 `p′ = p·(1+0.20·(T′/T−1))`
These parameters are **demonstration assumptions, not calibrated or validated**. If a baseline is missing the affected card is disabled with the missing input named. Projections are tagged "Scenario projection" and never feed the live KPI cards.

## Tests actually run
`npm test` (54 checks: 33 dashboard + 21 authority workflow): TomTom response parsers; success path rendering with fixtures shaped like documented provider responses; total-failure path (no readings, no numbers, key message shown); stale path (old value kept, labelled, original timestamp kept); simulator formula; HTML escaping of provider text. **These use fixtures, not live APIs** — the build sandbox could not reach the internet. Live verification checklist is in DATA_SOURCES.md.

## Known limitations
- Open-Meteo "current" and CAMS values are model grid estimates (CAMS is coarse over India); zones share grid cells, so zone values are near-identical.
- TomTom flow has no observation timestamp (fetch time shown, marked ≈) and no history; trend is session-only.
- Traffic/incidents require a TomTom key; free-tier daily limits apply.
- No verified Chennai public-transit, crowd, utility-outage or noise feed is configured.
- Simulator coefficients are unvalidated assumptions.
