# GQM Plan — CityPulse   (Owner: T2)
> Replace every TODO. Each metric must be measurable with a tool or a log, and link to Module 3/4 of the course.

| Goal | Question | Metric | How measured | Course link |
|---|---|---|---|---|
| G1 Data credibility | Q1 How much of the displayed data is live vs stale vs unavailable? | % live / stale / unavailable readings | System Quality page, from `store` | TODO |
| G1 | Q2 How reliable are the providers? | uptime %, p50/p95 latency | `node scripts/log-summary.js` | TODO |
| G2 Code quality | Q3 How complex is the code? | cyclomatic complexity per function, LOC, comment ratio | TODO tool | TODO |
| G2 | Q4 How well tested? | statement/branch coverage, defects found/fixed | TODO tool, defect log | TODO |
| G3 Governance process | Q5 How fast does the authority act? | time-to-approve, approval rate by type | admin audit log | TODO |
| G4 Simulator trust | Q6 How wrong is the simulator? | MAE per scenario, sample size | `scripts/evaluate-simulator.js` | TODO |
