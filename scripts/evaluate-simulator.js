// STARTER for T3. Goal: pair baseline readings with later observed outcomes from logs and report error (e.g. MAE) per scenario.
// The dashboard currently logs only fetch outcomes (ok/ms). T3 + Lead must extend logging to also store the metric VALUES
// (e.g. avg congestion %, precipitation, PM2.5) so predictions can be compared with later observations.
// Plan: 1) extend /api/log to record values  2) collect >= 1 week  3) for each rain event compare predicted vs observed congestion change
//       4) report n, MAE, bias; refit coefficients in admin-free simulator MODEL; document before/after in docs/simulator-validation.md
console.log('Not implemented yet — see header comment and docs/simulator-validation.md');
