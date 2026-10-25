# T1 live verification evidence

Checked: 2026-10-25 around 14:35-14:40 IST (local workstation, Chennai coordinates 13.0827, 80.2707).

These are point-in-time provider checks, not an uptime guarantee. No API keys or credentials are included.

Screenshots: [TomTom mobility view](tomtom-corridors.png) and [Open-Meteo dashboard readings](open-meteo-dashboard.png).

## TomTom Traffic Flow

The running local proxy at `http://localhost:3000/api/traffic` returned successful flow results for all five configured corridors. For each flow response, `matched` is the provider coordinate nearest the requested point along the returned segment geometry. Approximate offsets below use a simple degree-to-kilometre conversion; they are a sanity check, not a road-distance measurement.

| Corridor | Request (lat, lon) | Nearest matched point (lat, lon) | Approx. offset | Result |
|---|---|---|---:|---|
| MG Road | 13.061, 80.242 | 13.059198, 80.239962 | 0.30 km | `ok: true` |
| Anna Salai | 13.044, 80.2505 | 13.044561, 80.248079 | 0.28 km | `ok: true` |
| OMR | 12.901, 80.2279 | 12.901010, 80.227901 | 0.00 km | `ok: true` |
| ECR | 12.949, 80.259 | 12.950077, 80.254963 | 0.46 km | `ok: true` |
| GST Road | 13.007, 80.22 | 13.006740, 80.220705 | 0.08 km | `ok: true` |

The incidents portion returned `ok: true` with 159 incident items in this request. The live server's response is a successful TomTom proxy response; the logged verification run also recorded `incidentsOk: true`. TomTom incident counts can change between requests.

These are point-in-time local browser captures; the displayed values can change on refresh. The full five-corridor match list is recorded above because the narrow browser viewport clips the lower rows in the TomTom image.

## Open-Meteo

Both direct requests returned successfully:

| Endpoint check | HTTP | Observed timestamp | Sample response |
|---|---:|---|---|
| Forecast current temperature | 200 | Unix timestamp `1792918800` | `28.6 °C` |
| Air Quality current | 200 | `2026-10-25T09:00` | US AQI `41`; PM2.5 `3.3` |

Values are model estimates, not sensor readings. Timestamps and example values are included to make this a reproducible point-in-time record, not as current dashboard values.

## Source search evidence

The source discovery checks and their limitations are recorded in [`../../DATA_SOURCES.md`](../../DATA_SOURCES.md):

- OpenAQ and CPCB: no Chennai sensor endpoint/measurement was verified; keep sensor AQ data unavailable.
- Chennai Metro Rail and MTC: official pages checked, but no public machine-readable real-time feed/GTFS endpoint was verified.
- data.gov.in: portal/catalog requests returned HTTP 403 in this environment; catalog contents therefore remain unverified.
- Greater Chennai Corporation: official site reachable; no documented public API for the target feeds was identified in this check.

An inaccessible catalog is not evidence that a feed does not exist. Recheck data.gov.in from a browser/network with access and seek direct feed documentation from the agencies.

## Reproduction

With the dashboard server running and `TOMTOM_API_KEY` configured in the local `.env`, request `http://localhost:3000/api/traffic`. The key is read only by the local server; do not paste it into screenshots or commit `.env`. The Open-Meteo checks require no key and use the request URLs in [`../../DATA_SOURCES.md`](../../DATA_SOURCES.md).
