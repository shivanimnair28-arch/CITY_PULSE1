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

## T1 source investigation (checked 2026-10-25)

This is a discovery check, not evidence that the agencies have no feeds.

| Candidate | Official page checked | Finding |
|---|---|---|
| OpenAQ | [API documentation](https://docs.openaq.org/) | Documents geographic and measurement queries. No Chennai station/parameter response was verified in this check; do not label the CAMS model values as sensor data. |
| CPCB | [CPCB website](https://cpcb.gov.in/) | The landing page was reachable, but this check did not identify a documented, directly queryable Chennai station API/feed. |
| Chennai Metro Rail | [CMRL website](https://chennaimetrorail.org/) | Official website checked; no public real-time feed or GTFS endpoint was verified. |
| Metropolitan Transport Corporation | [MTC website](https://mtcbus.tn.gov.in/) | Website advertises live tracking services for users, but no public API/GTFS-Realtime endpoint was verified. Do not ingest website UI data as an open feed. |
| data.gov.in | [Open Government Data portal](https://www.data.gov.in/) | Portal and Chennai-targeted catalog pages returned HTTP 403 in this environment, so catalog contents could not be verified. |
| Greater Chennai Corporation | [GCC website](https://chennaicorporation.gov.in/gcc/) | Official site was reachable; no documented public real-time transit or sensor-data API was identified in this check. |

Next checks: obtain a station-level OpenAQ/CPCB response with timestamp, Chennai station identity and units; ask MTC/CMRL for an official feed or documented GTFS endpoint. Until then, sensor air quality and transit data remain unavailable.

## Live verification

Live provider checks were run on 2026-10-25; captured statuses, sample values, corridor matches, screenshots and limitations are recorded in [`docs/evidence/live-verification.md`](docs/evidence/live-verification.md). TomTom requests and Open-Meteo endpoints returned successfully.
