// Report workflow rules (pure functions — easy to unit test). Owner: T1.
const TYPES = ['incident', 'planned_work', 'advisory'];
const CATEGORIES = { incident: ['accident', 'heavy_traffic', 'flooding', 'road_damage', 'streetlight', 'water', 'other'], planned_work: ['road_construction', 'utility_work', 'maintenance', 'event'], advisory: ['general'] };
// submitted -> (under_review) -> approved | rejected | changes_requested ; approved -> resolved | cancelled
const TRANSITIONS = { submitted: ['under_review', 'approved', 'rejected', 'changes_requested'], under_review: ['approved', 'rejected', 'changes_requested'], changes_requested: ['submitted', 'rejected'], approved: ['resolved', 'cancelled'], rejected: [], resolved: [], cancelled: [] };
const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
const isDate = (s) => typeof s === 'string' && !isNaN(Date.parse(s));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validateSubmission(b) {
  const errors = [];
  if (!b || typeof b !== 'object') return { errors: ['Body must be a JSON object'] };
  if (b.website) return { errors: ['Rejected'] }; // honeypot field: humans leave it empty
  const type = b.type;
  if (!TYPES.includes(type)) errors.push('type must be one of ' + TYPES.join(', '));
  const category = str(b.category, 40);
  if (TYPES.includes(type) && !CATEGORIES[type].includes(category)) errors.push('category invalid for ' + type);
  const title = str(b.title, 120), description = str(b.description, 1000), road = str(b.road, 120), area = str(b.area, 80);
  if (title.length < 5) errors.push('title must be at least 5 characters');
  if (description.length < 10) errors.push('description must be at least 10 characters');
  if (!road && !area) errors.push('road or area is required');
  let lat = null, lon = null;
  if (b.lat != null || b.lon != null) { lat = Number(b.lat); lon = Number(b.lon); if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) errors.push('lat/lon out of range'); }
  const out = { type, category, title, description, road, area, lat, lon, alternative: str(b.alternative, 200), activeFrom: null, activeUntil: null, permitRef: '' };
  if (type === 'planned_work') {
    out.permitRef = str(b.permitRef, 80);
    if (!out.permitRef) errors.push('permitRef is required for planned_work');
    if (!isDate(b.activeFrom) || !isDate(b.activeUntil)) errors.push('activeFrom and activeUntil (ISO dates) are required for planned_work');
    else if (Date.parse(b.activeUntil) <= Date.parse(b.activeFrom)) errors.push('activeUntil must be after activeFrom');
    else { out.activeFrom = new Date(b.activeFrom).toISOString(); out.activeUntil = new Date(b.activeUntil).toISOString(); }
  } else {
    if (isDate(b.activeFrom)) out.activeFrom = new Date(b.activeFrom).toISOString();
    if (isDate(b.activeUntil)) out.activeUntil = new Date(b.activeUntil).toISOString();
  }
  return { errors, value: out };
}
const isPublic = (r, now = Date.now()) => r.state === 'approved' && (!r.activeFrom || Date.parse(r.activeFrom) <= now) && (!r.activeUntil || Date.parse(r.activeUntil) >= now);
// Public view: never includes permit reference, reporter details, reviewer notes or IP.
const toPublic = (r) => ({ id: r.id, type: r.type, category: r.category, title: r.title, description: r.description, road: r.road, area: r.area, lat: r.lat, lon: r.lon,
  activeFrom: r.activeFrom, activeUntil: r.activeUntil, alternative: r.alternative, approvedAt: r.approvedAt, verifiedBy: 'Authority (simulated role)' });
module.exports = { TYPES, CATEGORIES, TRANSITIONS, canTransition, validateSubmission, isPublic, toPublic };
