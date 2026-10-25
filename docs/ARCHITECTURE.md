# CityPulse Architecture

```mermaid
flowchart LR
  subgraph Providers["External providers"]
    OM["Open-Meteo Forecast\n(model)"]
    AQ["Open-Meteo Air Quality / CAMS\n(model)"]
    TT["TomTom Flow + Incidents\n(provider-reported)"]
    SN["Sensor source (T1: OpenAQ/CPCB)\n(sensor obs, if found)"]
  end
  subgraph Public["Public server :3000 (server.js)"]
    P1["/api/traffic (proxy + cache, key in .env)"]
    P2["/api/log (fetch outcomes -> logs/fetch-log.jsonl)"]
    P3["/api/config, /api/health"]
  end
  subgraph Auth["Authority server :4000 (admin/server.js)"]
    A1["POST /api/reports (anonymous, rate-limited)"]
    A2["Admin/viewer API: login, review, approve/reject, close, audit, workflow metrics"]
    A3["GET /api/public/notices (approved + active only)"]
    DB[("authority.sqlite")]
  end
  subgraph Web["Browser dashboard (project_citypulse.html)"]
    DL["Shared data layer: pollers, validation, normalised readings, trust score"]
    UI["9 sections + System Quality (T2) + Authority notices"]
    SIM["What-If Simulator (T3)"]
  end
  Citizen["Citizen / contractor\nreport form"] --> A1
  Officer["Authority officer\nadmin console"] --> A2
  A1 --> DB
  A2 <--> DB
  DB --> A3
  OM --> DL
  AQ --> DL
  TT --> P1 --> DL
  SN -.-> DL
  A3 --> DL
  DL --> UI
  DL --> SIM
  DL --> P2
  P2 --> LOG[("fetch-log.jsonl")]
  LOG --> M["Uptime / quality metrics (T2)"]
  LOG --> V["Simulator evaluation (T3)"]
```

## Data classes shown on screen
| Class | Source | Example |
|---|---|---|
| Sensor observation | measured sensor feed | (only if T1 finds one) |
| Provider-reported | TomTom values/incidents | speeds, incident reports |
| Model estimate | Open-Meteo, CAMS | temperature, PM2.5, US AQI |
| Derived | formula on the above | congestion %, trust score |
| Authority-verified | approved by the authority server | planned works, verified incidents |
| Scenario projection | simulator | projected congestion |
| Unavailable | no source | noise, crowd, transit |

## Evidence ladder for incident wording
Slow-down alone → "Heavy traffic — no incident reported". "Accident" only if TomTom reports one nearby (1 km) or an authority-approved report exists. Approved planned works on the road → "Planned work — avoid".

## Team ownership map
| Component | Owner |
|---|---|
| `server.js`, data layer, CI, trust score, deploy | Lead |
| `admin/` backend, `config.json`, `DATA_SOURCES.md`, sensor/transit sources | T1 |
| System Quality section, GQM, metrics, tests | T2 |
| Simulator, Analytics, `scripts/evaluate-simulator.js` | T3 |
| `admin/report.html`, `admin/admin.html`, notices panel UI, accessibility, PPT, demo | T4 |
