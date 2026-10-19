# CityPulse data sources

| | Open-Meteo Forecast | Open-Meteo Air Quality | TomTom Traffic Flow | TomTom Traffic Incidents |
|---|---|---|---|---|
| Docs | open-meteo.com/en/docs | open-meteo.com/en/docs/air-quality-api | developer.tomtom.com/traffic-api | developer.tomtom.com/traffic-api/traffic-api-documentation-traffic-incidents/incident-details |
| Endpoint | `api.open-meteo.com/v1/forecast` | `air-quality-api.open-meteo.com/v1/air-quality` | `api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json` | `api.tomtom.com/traffic/services/5/incidentDetails` |
| Auth | none | none | API key (server `.env`) | API key (server `.env`) |
| Metrics used | temperature, humidity, feels-like, precipitation, weather code, wind (current); hourly temperature (past 24 h) | us_aqi, pm2_5, pm10, ozone, nitrogen_dioxide (current); hourly us_aqi, pm2_5 (past 24 h) | currentSpeed, freeFlowSpeed, travel times, confidence, roadClosure | category, description, from/to, delay, start/end, timeValidity |
| Coverage | global model | CAMS global (~45 km) / European (~11 km, Europe only) | road segments nearest each sample point | bbox = city ± `bboxRadiusDeg` |
| Data type | model estimate | model estimate (not sensors) | provider-reported | provider-reported reports |
| Timestamp field | `current.time` (unix, `timeformat=unixtime`) | `current.time` | none — fetch time used (≈) | `startTime`/`endTime`/`lastReportTime` |
| Update frequency | current: 15-min model steps | hourly model; forecast refreshed daily | updated frequently (~minute-level per TomTom) | updated every minute (per TomTom SDK docs) |
| Licence / attribution | CC BY 4.0 style attribution to Open-Meteo.com; free tier non-commercial | must credit **CAMS ENSEMBLE data provider** and Open-Meteo | "Traffic data © TomTom"; subject to TomTom terms | same |
| Limits | free tier fair-use | free tier fair-use | free tier daily request cap; ~6 calls/cycle here | counted with the above |

Dashboard polling: 600 s / 900 s / 300 s (configurable; minimums 300 / 300 / 120 s).

## Not connected (no verified feed) — shown as Unavailable
Noise levels · public transport status & passenger counts · crowd density/station occupancy · public events · streetlight/water/power outage data · asset-health or failure-risk scoring. Candidates to investigate: Chennai Metro / MTC open data or GTFS-Realtime, Greater Chennai Corporation / data.gov.in feeds, OpenAQ or CPCB for sensor-based air quality.

## Live verification checklist (not yet executed from the build sandbox)
1. `curl "https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m&timeformat=unixtime"` returns `current.time`.
2. `curl "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.0827&longitude=80.2707&current=us_aqi,pm2_5"` returns values.
3. With the key set, `curl localhost:3000/api/traffic` returns `corridors[].ok=true`; check each `matched` position is on the intended road and adjust `config.json` if not.
4. Confirm the incidents `fields` query returns 200 (a 400 means a field name was rejected — check `incidents.error`).
