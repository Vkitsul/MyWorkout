'use strict';
/* MyWorkout — plan, run and review bodyweight / bar / dumbbell / EZ bar / pulley / bench workouts.
   Everything lives in localStorage on the device; nothing is sent anywhere. */

// ---------------------------------------------------------------- constants
const ZONES = {
  chest: 'Chest', deltoids: 'Shoulders', trapezius: 'Traps', 'upper-back': 'Lats & upper back',
  'lower-back': 'Lower back', biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', gluteal: 'Glutes', quadriceps: 'Quads',
  hamstring: 'Hamstrings', adductors: 'Adductors', calves: 'Calves',
};
const ZONE_KEYS = Object.keys(ZONES);
const EQ = { corpo: 'Bodyweight', sbarra: 'Pull-up bar', manubri: 'Dumbbells', ezbar: 'EZ bar', pulley: 'Cable' };
const CAT = { strength: 'Strength', plyometrics: 'Plyometrics', stretching: 'Stretching', powerlifting: 'Strength' };
const LVL = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Advanced' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 864e5;
const KEY = 'myworkout.v1';

const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke-width="3"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
};

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const weekday = d => (new Date(d).getDay() + 6) % 7;            // 0 = Monday
const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfWeek = t => startOfDay(t) - weekday(t) * DAY;
const startOfMonth = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0');
}
function fmtDur(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return min + ' min';
  const h = Math.floor(min / 60), m = min % 60;
  return h + ' h' + (m ? ' ' + m + ' min' : '');
}
const fmtHours = ms => (ms / 36e5).toLocaleString('en-GB', { maximumFractionDigits: 1 }) + ' h';
const fmtTime = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function fmtDate(t) {
  const d = new Date(t);
  return DAYS_LONG[weekday(t)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
}
const fmtSets = n => (Math.round(n * 2) / 2).toLocaleString('en-GB');

// ---------------------------------------------------------------- state
function defaults() {
  return { plans: [], sessions: [], active: null, custom: [], videos: {}, settings: { body: 'male', rest: 90 } };
}
function load() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j && typeof j === 'object') {
      const d = defaults();
      return { ...d, ...j, settings: { ...d.settings, ...(j.settings || {}) } };
    }
  } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  return defaults();
}
let S = load();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save data on this device'); }
}
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* optional */ }

// UI state that does not need to survive a reload.
const UI = {
  q: '', eq: new Set(), zone: '', cat: '', mine: false, bench: 'all',
  pick: null,              // { target: 'plan' | 'session', id, sel: Set }
  open: new Set(),         // expanded workout cards
  lastRoute: '',
};

let EX = {};
function rebuildEx() {
  EX = {};
  for (const e of window.CATALOG) EX[e.id] = e;
  for (const e of S.custom) EX[e.id] = e;
}
rebuildEx();
const exName = id => (EX[id] ? EX[id].n : 'Removed exercise');

// ---------------------------------------------------------------- muscles
function loadOf(items, planned = false, primaryOnly = false) {
  const L = {};
  for (const it of items) {
    const ex = EX[it.ex];
    if (!ex) continue;
    // Plans store a set count; workouts store one flag per set.
    const n = planned ? (it.done ? it.done.length : (+it.sets || 0)) : (it.done || []).filter(Boolean).length;
    if (!n) continue;
    ex.p.forEach(z => { L[z] = (L[z] || 0) + n; });
    if (!primaryOnly) ex.s.forEach(z => { L[z] = (L[z] || 0) + n * 0.5; });
  }
  return L;
}
function addLoads(a, b) { for (const z in b) a[z] = (a[z] || 0) + b[z]; return a; }
function rangeLoad(since) {
  const L = {};
  S.sessions.filter(s => s.end >= since).forEach(s => addLoads(L, loadOf(s.items)));
  return L;
}
const missingZones = L => ZONE_KEYS.filter(z => !L[z]);

function bodyMap(load, { compact = false, caption = true } = {}) {
  const B = window.BODY[S.settings.body] || window.BODY.male;
  const vals = Object.values(load);
  const max = vals.length ? Math.max(...vals) : 0;
  const lvl = z => { const v = load[z] || 0; return v && max ? clamp(Math.ceil(v / max * 4), 1, 4) : 0; };
  const view = v => '<svg class="bm-v" viewBox="' + v.vb + '" aria-hidden="true">' +
    Object.entries(v.p).map(([part, ds]) => ds.map(d => ZONES[part]
      ? '<path d="' + d + '" class="bm-m l' + lvl(part) + '" data-zone="' + part + '"/>'
      : '<path d="' + d + '" class="bm-sil"/>').join('')).join('') + '</svg>';
  return '<div class="bm' + (compact ? ' compact' : '') + '" data-load=\'' + esc(JSON.stringify(load)) + '\'>' +
    '<div class="bm-views">' + view(B.front) + view(B.back) + '</div>' +
    (caption ? '<div class="bm-cap muted small">Tap a muscle for details</div>' : '') +
    '<div class="legend">less <i style="background:var(--heat1)"></i><i style="background:var(--heat2)"></i><i style="background:var(--heat3)"></i><i style="background:var(--heat4)"></i> more · <i style="background:var(--heat0)"></i> not trained</div>' +
    '</div>';
}

function zoneGrid(L, warn = true) {
  const max = Math.max(1, ...Object.values(L));
  return '<div class="zone-grid">' + ZONE_KEYS.map(z => {
    const v = L[z] || 0;
    return '<div class="zone' + (v ? '' : warn ? ' miss' : ' muted') + '"><span style="width:84px" class="ellipsis">' + ZONES[z] + '</span>' +
      '<span class="bar"><i style="width:' + (v / max * 100) + '%"></i></span><span class="n">' + (v ? fmtSets(v) : '—') + '</span></div>';
  }).join('') + '</div><p class="muted small" style="margin:10px 0 0">Effective sets per area (primary 1, secondary ½).</p>';
}

function zoneChips(zs, cls = '') {
  return '<div class="chips">' + zs.map(z => '<span class="chip tiny ' + cls + '">' + ZONES[z] + '</span>').join('') + '</div>';
}

// ---------------------------------------------------------------- exercises UI bits
function thumb(ex) {
  if (ex && ex.img && ex.img[0]) {
    return '<span class="thumb-wrap" data-zoom="' + esc(ex.id) + '" role="button" aria-label="Enlarge ' + esc(ex.n) + '">' +
      '<img class="thumb" src="' + ex.img[0] + '" alt="" loading="lazy" decoding="async"><i class="zoom-badge">' + I.expand + '</i></span>';
  }
  return '<div class="thumb ph">' + (ex && EQ[ex.eq] ? EQ[ex.eq].split(' ')[0] : '') + '</div>';
}
function demo(ex) {
  if (!ex || !ex.img || !ex.img.length) return '<div class="demo empty">No image — add your own video below</div>';
  return '<div class="demo" data-zoom="' + esc(ex.id) + '" role="button" aria-label="Enlarge"><img src="' + ex.img[0] + '" alt="' + esc(ex.n) + '">' +
    (ex.img[1] ? '<img class="f2" src="' + ex.img[1] + '" alt="">' : '') + '<i class="zoom-badge big">' + I.expand + '</i></div>';
}

// ---------------------------------------------------------------- full-screen demo
// The dataset ships a start and an end position per exercise; cross-fading between them
// at a chosen pace reads as the movement itself.
const Z = { id: null, speed: 1, smooth: true, paused: false, frame: 0 };
const SPEEDS = [['Slow', 4.2], ['Normal', 2.6], ['Fast', 1.5]];
function openZoom(id) {
  if (!EX[id]) return;
  Object.assign(Z, { id, paused: false, frame: 0 });
  renderZoom();
  $('#zoom').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeZoom() {
  const z = $('#zoom');
  if (z.hidden) return;
  z.hidden = true; z.innerHTML = '';
  if ($('#sheet').hidden) document.body.style.overflow = '';
}
function renderZoom() {
  const ex = EX[Z.id];
  const two = ex.img && ex.img[1];
  const anim = two && !Z.paused;
  const dur = SPEEDS[Z.speed][1];
  let h = '<div class="zoom-top"><div class="grow"><b>' + esc(ex.n) + '</b><div class="small" style="opacity:.7">' + esc(exMeta(ex)) + '</div></div>' +
    '<button class="zoom-x" data-zact="close" aria-label="Close">' + I.x + '</button></div>';
  h += '<div class="zoom-stage" data-zact="toggle"><div class="zoom-demo' + (anim ? (Z.smooth ? ' smooth' : ' snap') : '') + '" style="--dur:' + dur + 's">' +
    '<img src="' + ex.img[0] + '" alt="' + esc(ex.n) + ', start position">' +
    (two ? '<img class="f2" src="' + ex.img[1] + '" alt="' + esc(ex.n) + ', end position"' + (anim ? '' : ' style="opacity:' + Z.frame + '"') + '>' : '') +
    '</div>' + (two ? '<div class="zoom-tag">' + (anim ? 'Tap to pause' : 'Position ' + (Z.frame + 1) + ' of 2 · tap to play') + '</div>' : '') + '</div>';
  h += '<div class="zoom-ctl">';
  if (two) {
    h += '<div class="seg">' + SPEEDS.map(([l], i) => '<button class="' + (Z.speed === i && !Z.paused ? 'on' : '') + '" data-zact="speed" data-v="' + i + '">' + l + '</button>').join('') + '</div>' +
      '<div class="seg">' +
      '<button class="' + (!Z.paused && Z.smooth ? 'on' : '') + '" data-zact="mode" data-v="1">Smooth</button>' +
      '<button class="' + (!Z.paused && !Z.smooth ? 'on' : '') + '" data-zact="mode" data-v="0">Step</button>' +
      '<button class="' + (Z.paused && Z.frame === 0 ? 'on' : '') + '" data-zact="frame" data-v="0">Start</button>' +
      '<button class="' + (Z.paused && Z.frame === 1 ? 'on' : '') + '" data-zact="frame" data-v="1">End</button></div>';
  }
  h += '<button class="btn block" data-zact="info">' + I.video + ' Instructions & video</button></div>';
  $('#zoom').innerHTML = h;
}
const zoomActions = {
  close: () => closeZoom(),
  toggle: () => { if (!EX[Z.id].img[1]) return; if (Z.paused) Z.paused = false; else { Z.paused = true; Z.frame = 0; } renderZoom(); },
  speed: el => { Z.speed = +el.dataset.v; Z.paused = false; renderZoom(); },
  mode: el => { Z.smooth = el.dataset.v === '1'; Z.paused = false; renderZoom(); },
  frame: el => { Z.paused = true; Z.frame = +el.dataset.v; renderZoom(); },
  info: () => { const id = Z.id; closeZoom(); sheetExercise(id); },
};
function exMeta(ex) {
  const bits = [EQ[ex.eq]];
  if (ex.b) bits.push('Bench');
  return bits.join(' + ') + ' · ' + ex.p.map(z => ZONES[z]).join(', ');
}
function ytId(u) {
  const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
const ytSearch = ex => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.n + ' exercise form tutorial');

// ---------------------------------------------------------------- views
function pageHead(title, { sub = '', back = '', right = '' } = {}) {
  return '<header class="top">' +
    (back ? '<a class="back" href="' + back + '">' + I.back + '</a>' : '') +
    '<div class="grow"><h1>' + esc(title) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + right + '</header>';
}

function activeBanner() {
  const a = S.active;
  if (!a) return '';
  return '<a class="banner" href="#/workout"><span class="pulse"></span><div class="grow"><div class="small" style="opacity:.8">Workout in progress · ' + esc(a.name) + '</div>' +
    '<div class="clock" data-clock>' + fmtClock(elapsed()) + '</div></div><b>Resume ›</b></a>';
}

function viewToday() {
  const now = Date.now(), wd = weekday(now);
  const today = S.plans.filter(p => (p.days || []).includes(wd));
  const others = S.plans.filter(p => !(p.days || []).includes(wd));
  const doneToday = S.sessions.filter(s => s.end >= startOfDay(now));
  const since7 = now - 7 * DAY;
  const L7 = rangeLoad(since7);
  const s7 = S.sessions.filter(s => s.end >= since7);
  const miss = missingZones(L7);
  const wk = S.sessions.filter(s => s.end >= startOfWeek(now));

  let h = pageHead('Today', { sub: fmtDate(now), right: '<button class="icon-btn" data-act="settings" aria-label="Settings">' + I.gear + '</button>' });
  h += activeBanner();

  h += '<h2>Scheduled</h2>';
  if (!S.plans.length) {
    h += '<div class="card empty-state"><h3>No plans yet</h3><p>Create your first plan or start from the examples.</p>' +
      '<div class="btn-row"><a class="btn" href="#/plans">Go to plans</a><button class="btn primary" data-act="seed">Example plans</button></div></div>';
  } else if (today.length) {
    h += today.map(p => planCard(p, doneToday.some(s => s.planId === p.id))).join('');
  } else {
    h += '<div class="card"><h3>Rest day</h3><p class="muted small" style="margin:4px 0 0">No plan scheduled for ' + DAYS_LONG[wd] + '. You can still start one:</p></div>';
  }
  if (S.plans.length && others.length && today.length) h += '<details class="card"><summary class="muted">Other plans</summary><div class="sep"></div>' + others.map(p => planLine(p)).join('') + '</details>';
  else if (!today.length && others.length) h += others.map(p => planLine(p)).join('');
  h += '<button class="btn block" data-act="free" style="margin-top:4px">' + I.plus + ' Free workout</button>';

  h += '<h2>Last 7 days</h2><div class="tiles">' +
    '<div class="tile"><b>' + s7.length + '</b><span>workout</span></div>' +
    '<div class="tile"><b>' + fmtHours(s7.reduce((a, s) => a + s.dur, 0)) + '</b><span>trained</span></div>' +
    '<div class="tile"><b>' + (ZONE_KEYS.length - miss.length) + '/' + ZONE_KEYS.length + '</b><span>areas trained</span></div></div>';
  h += '<div class="card" style="margin-top:8px">' + bodyMap(L7) + '</div>';
  if (s7.length) {
    h += miss.length
      ? '<div class="alert"><b>Not trained in the last 7 days</b>' + miss.map(z => ZONES[z]).join(', ') + '</div>'
      : '<div class="alert ok"><b>Great!</b>You trained every area in the last 7 days.</div>';
    h += '<details class="card"><summary class="muted">Breakdown by area</summary>' + zoneGrid(L7) + '</details>';
  }
  h += '<p class="muted small center">This week: ' + wk.length + ' workout · ' + fmtDur(wk.reduce((a, s) => a + s.dur, 0)) + '</p>';
  return h;
}

function planZones(p) {
  const L = loadOf(p.items, true);
  return ZONE_KEYS.filter(z => L[z]);
}
function daysBadge(p) {
  return '<div class="days">' + DAYS.map((d, i) => '<span class="day' + ((p.days || []).includes(i) ? ' on' : '') + '">' + d[0] + d[1] + '</span>').join('') + '</div>';
}
function planCard(p, done) {
  const sets = p.items.reduce((a, it) => a + (+it.sets || 0), 0);
  return '<div class="card plan-card"><div class="row"><div class="grow"><h3>' + esc(p.name) + '</h3>' +
    '<div class="meta">' + p.items.length + ' exercises · ' + sets + ' sets' + (done ? ' · <span style="color:var(--ok)">done today ✓</span>' : '') + '</div></div></div>' +
    zoneChips(planZones(p)) + '<div class="sep"></div>' +
    '<div class="btn-row"><a class="btn" href="#/plan/' + p.id + '">Edit</a><button class="btn primary" data-act="start" data-id="' + p.id + '">' + I.play + ' Start</button></div></div>';
}
function planLine(p) {
  return '<div class="row" style="padding:6px 0"><div class="grow"><b>' + esc(p.name) + '</b><div class="muted small">' + p.items.length + ' exercises</div></div>' +
    '<button class="btn sm primary" data-act="start" data-id="' + p.id + '">Start</button></div>';
}

function viewPlans() {
  let h = pageHead('Plans', { sub: 'Your weekly schedule', right: '<button class="icon-btn" data-act="new-plan" aria-label="New plan">' + I.plus + '</button>' });
  h += activeBanner();
  if (!S.plans.length) {
    return h + '<div class="card empty-state"><h3>No plans yet</h3><p>A plan is a list of exercises with sets, reps and rest. Assign it to days of the week.</p>' +
      '<div class="btn-row"><button class="btn" data-act="seed">Example plans</button><button class="btn primary" data-act="new-plan">Create plan</button></div></div>';
  }
  h += S.plans.map(p => '<div class="card plan-card"><a href="#/plan/' + p.id + '" style="text-decoration:none"><h3>' + esc(p.name) + '</h3>' +
    '<div class="meta">' + p.items.length + ' exercises · ~' + estMinutes(p) + ' min</div>' + daysBadge(p) + '<div class="sep"></div>' + zoneChips(planZones(p)) + '</a>' +
    '<div class="sep"></div><div class="btn-row"><a class="btn" href="#/plan/' + p.id + '">Edit</a><button class="btn primary" data-act="start" data-id="' + p.id + '">' + I.play + ' Start</button></div></div>').join('');
  // Weekly coverage of the whole plan.
  const L = {};
  S.plans.forEach(p => { if ((p.days || []).length) addLoads(L, Object.fromEntries(Object.entries(loadOf(p.items, true)).map(([z, v]) => [z, v * p.days.length]))); });
  if (Object.keys(L).length) {
    const miss = missingZones(L);
    h += '<h2>Weekly plan coverage</h2><div class="card">' + bodyMap(L, { compact: true }) + zoneGrid(L) + '</div>';
    if (miss.length) h += '<div class="alert"><b>Your plan doesn\'t cover</b>' + miss.map(z => ZONES[z]).join(', ') + '</div>';
  }
  return h;
}
function estMinutes(p) {
  // ~40 s per set of work plus the planned rest.
  const s = p.items.reduce((a, it) => a + (+it.sets || 0) * (40 + (+it.rest || S.settings.rest)), 0);
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}

function viewPlan(id) {
  const p = S.plans.find(x => x.id === id);
  if (!p) return pageHead('Plan', { back: '#/plans' }) + '<p class="muted">Plan not found.</p>';
  let h = pageHead(p.name || 'Plan', { back: '#/plans' });
  h += '<label class="field">Name<input class="input" data-plan-f="name" value="' + esc(p.name) + '" placeholder="e.g. Push, Legs, Full body"></label>';
  h += '<div class="field" style="font-size:13px;color:var(--muted)">Days<div class="days edit" style="margin-top:6px">' +
    DAYS.map((d, i) => '<button class="day' + ((p.days || []).includes(i) ? ' on' : '') + '" data-act="day" data-i="' + i + '">' + d + '</button>').join('') + '</div></div>';
  h += '<h2>Exercises · ' + p.items.length + '</h2>';
  if (!p.items.length) h += '<div class="card empty-state">Add the exercises you want in this plan.</div>';
  else h += '<div class="card flat list">' + p.items.map((it, i) => {
    const ex = EX[it.ex];
    return '<div class="item" data-uid="' + it.uid + '">' + thumb(ex) +
      '<div class="grow"><button class="name" data-act="ex" data-id="' + esc(it.ex) + '">' + esc(exName(it.ex)) + '</button>' +
      '<div class="fields"><label>Sets<input class="input" type="number" inputmode="numeric" min="1" max="20" data-f="sets" value="' + esc(it.sets) + '"></label>' +
      '<label>Reps<input class="input" data-f="reps" value="' + esc(it.reps) + '" placeholder="10 / 30s"></label>' +
      '<label>Rest (s)<input class="input" type="number" inputmode="numeric" min="0" step="15" data-f="rest" value="' + esc(it.rest) + '"></label></div>' +
      '<input class="input note" data-f="note" value="' + esc(it.note || '') + '" placeholder="Note (weight, grip, tempo…)"></div>' +
      '<div class="ord"><button data-act="mv" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled style="opacity:.3"') + '>' + I.up + '</button>' +
      '<button data-act="mv" data-d="1" aria-label="Move down"' + (i < p.items.length - 1 ? '' : ' disabled style="opacity:.3"') + '>' + I.down + '</button>' +
      '<button data-act="rm-item" aria-label="Remove" style="color:var(--bad)">' + I.x + '</button></div></div>';
  }).join('') + '</div>';
  h += '<button class="btn block" data-act="pick" data-target="plan" data-id="' + p.id + '">' + I.plus + ' Add exercises</button>';
  if (p.items.length) {
    const L = loadOf(p.items, true), miss = missingZones(L);
    h += '<h2>Muscles worked</h2><div class="card">' + bodyMap(L, { compact: true }) + '</div>';
    if (miss.length) h += '<p class="muted small">Not worked by this plan: ' + miss.map(z => ZONES[z]).join(', ') + '</p>';
    h += '<div class="sep"></div><button class="btn primary block" data-act="start" data-id="' + p.id + '">' + I.play + ' Start workout (~' + estMinutes(p) + ' min)</button>';
  }
  h += '<div class="sep"></div><div class="btn-row"><button class="btn" data-act="dup-plan">Duplicate</button><button class="btn danger" data-act="del-plan">Delete plan</button></div>';
  return h;
}

function filteredExercises() {
  const q = UI.q.trim().toLowerCase();
  const mine = new Set(S.plans.flatMap(p => p.items.map(it => it.ex)));
  const words = q.split(/\s+/).filter(Boolean);
  return Object.values(EX).filter(ex => {
    if (UI.eq.size && !UI.eq.has(ex.eq)) return false;
    if (UI.bench === 'no' && ex.b) return false;
    if (UI.bench === 'yes' && !ex.b) return false;
    if (UI.zone && !ex.p.includes(UI.zone) && !ex.s.includes(UI.zone)) return false;
    if (UI.cat && (CAT[ex.cat] || 'Strength') !== CAT[UI.cat]) return false;
    if (UI.mine && !mine.has(ex.id)) return false;
    if (words.length) {
      const hay = (ex.n + ' ' + EQ[ex.eq] + ' ' + ex.p.concat(ex.s).map(z => ZONES[z]).join(' ') + (ex.b ? ' bench' : '')).toLowerCase();
      if (!words.every(w => hay.includes(w))) return false;
    }
    return true;
  }).sort((a, b) => {
    if (UI.zone) {               // primary movers for the chosen zone first
      const pa = a.p.includes(UI.zone) ? 0 : 1, pb = b.p.includes(UI.zone) ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return a.n.localeCompare(b.n);
  });
}

function exListHtml() {
  const list = filteredExercises();
  const pick = UI.pick;
  if (!list.length) return '<div class="card empty-state">No exercises match these filters.</div>';
  return '<p class="muted small">' + list.length + ' exercises</p><div class="card flat list">' + list.map(ex =>
    '<button class="ex-row" data-act="' + (pick ? 'pick-toggle' : 'ex') + '" data-id="' + esc(ex.id) + '">' + thumb(ex) +
    '<div class="grow"><div class="name">' + esc(ex.n) + '</div><div class="meta">' + esc(exMeta(ex)) + '</div></div>' +
    (pick ? '<span class="pick-mark' + (pick.sel.has(ex.id) ? ' on' : '') + '">' + (pick.sel.has(ex.id) ? I.check : '') + '</span>' : '') +
    '</button>').join('') + '</div>';
}

function viewLibrary() {
  const pick = UI.pick;
  let h;
  if (pick) {
    const name = pick.target === 'plan' ? (S.plans.find(p => p.id === pick.id) || {}).name : 'current workout';
    h = pageHead('Add exercises', { sub: 'to ' + esc(name || ''), right: '<button class="btn ghost" data-act="pick-cancel">Cancel</button>' });
  } else {
    h = pageHead('Exercises', { sub: Object.keys(EX).length + ' exercises for your equipment', right: '<button class="icon-btn" data-act="new-ex" aria-label="New exercise">' + I.plus + '</button>' });
  }
  h += '<div class="search">' + I.search + '<input class="input" type="search" id="q" value="' + esc(UI.q) + '" placeholder="Search (e.g. curl, chest, bench)" autocomplete="off"></div>';
  h += '<div class="scroll-x">' + (S.plans.length ? '<button class="chip' + (UI.mine ? ' on' : '') + '" data-act="f-mine">In my plans</button>' : '') +
    Object.entries(EQ).map(([k, v]) => '<button class="chip' + (UI.eq.has(k) ? ' on' : '') + '" data-act="f-eq" data-k="' + k + '">' + v + '</button>').join('') + '</div>';
  h += '<div class="filters">' +
    '<select class="input" id="f-zone"><option value="">All muscles</option>' + ZONE_KEYS.map(z => '<option value="' + z + '"' + (UI.zone === z ? ' selected' : '') + '>' + ZONES[z] + '</option>').join('') + '</select>' +
    '<select class="input" id="f-bench"><option value="all">Bench: any</option><option value="no"' + (UI.bench === 'no' ? ' selected' : '') + '>No bench</option><option value="yes"' + (UI.bench === 'yes' ? ' selected' : '') + '>With bench</option></select>' +
    '<select class="input" id="f-cat"><option value="">Type</option><option value="strength"' + (UI.cat === 'strength' ? ' selected' : '') + '>Strength</option><option value="plyometrics"' + (UI.cat === 'plyometrics' ? ' selected' : '') + '>Plyometrics</option><option value="stretching"' + (UI.cat === 'stretching' ? ' selected' : '') + '>Stretching</option></select></div>';
  h += '<div id="exlist">' + exListHtml() + '</div>';
  if (pick) h += '<div class="pickbar"><button class="btn primary block" data-act="pick-done"' + (pick.sel.size ? '' : ' disabled style="opacity:.5"') + '>Add ' + pick.sel.size + ' exercise' + (pick.sel.size === 1 ? '' : 's') + '</button></div>';
  return h;
}

// ---------------------------------------------------------------- workout
function elapsed() {
  const a = S.active;
  if (!a) return 0;
  return (a.pausedAt || Date.now()) - a.start - (a.pausedTotal || 0);
}
function lastNote(exId) {
  for (const s of S.sessions) {
    const it = s.items.find(x => x.ex === exId && x.note);
    if (it) return { note: it.note, when: s.end };
  }
  return null;
}
function viewWorkout() {
  const a = S.active;
  if (!a) return pageHead('Workout', { back: '#/today' }) + '<div class="card empty-state">No workout in progress.</div>';
  const total = a.items.reduce((n, it) => n + it.done.length, 0);
  const done = a.items.reduce((n, it) => n + it.done.filter(Boolean).length, 0);
  let h = '<div class="wtop"><div class="row"><a class="back" href="#/today">' + I.back + '</a><div class="grow ellipsis"><b>' + esc(a.name) + '</b><div class="muted small">started at ' + fmtTime(a.start) + '</div></div>' +
    '<button class="btn sm primary" data-act="finish">Finish</button></div>' +
    '<div class="row" style="margin-top:10px"><div class="wclock' + (a.pausedAt ? ' paused' : '') + ' grow" data-clock>' + fmtClock(elapsed()) + '</div>' +
    '<button class="icon-btn" data-act="pause" aria-label="' + (a.pausedAt ? 'Resume' : 'Pause') + '" style="width:48px;height:48px">' + (a.pausedAt ? I.play : I.pause) + '</button></div>' +
    '<div class="row small muted" style="margin-top:8px"><span class="grow">' + done + '/' + total + ' sets</span><span>' + a.items.filter(it => it.done.length && it.done.every(Boolean)).length + '/' + a.items.length + ' exercises done</span></div>' +
    '<div class="progress"><i style="width:' + (total ? done / total * 100 : 0) + '%"></i></div></div>';
  if (a.pausedAt) h += '<div class="alert" style="background:var(--surface2);color:var(--text)"><b>Paused</b>The timer is stopped. Tap ▶ to resume.</div>';
  if (!a.items.length) h += '<div class="card empty-state">Add the exercises you\'re doing.</div>';
  h += a.items.map(it => {
    const ex = EX[it.ex] || { n: 'Removed exercise', p: [], s: [], eq: '' };
    const k = it.done.filter(Boolean).length, all = it.done.length && k === it.done.length;
    const open = UI.open.has(it.uid);
    const prev = open ? lastNote(it.ex) : null;
    return '<div class="wcard' + (all ? ' done' : '') + '" data-uid="' + it.uid + '">' +
      '<button class="wc-head" data-act="card">' + thumb(ex) + '<div class="grow"><div class="name">' + esc(ex.n) + '</div>' +
      '<div class="meta">' + it.done.length + ' × ' + esc(it.reps || '—') + ' · rest ' + (+it.rest || 0) + 's' + (it.note && !open ? ' · ' + esc(it.note) : '') + '</div></div>' +
      '<span class="status">' + (all ? '✓' : k + '/' + it.done.length) + '</span></button>' +
      '<div class="sets">' + it.done.map((d, i) => '<button class="set' + (d ? ' on' : '') + '" data-act="set" data-i="' + i + '" aria-label="Set ' + (i + 1) + '">' + (d ? '✓' : i + 1) + '</button>').join('') +
      '<button class="set add" data-act="addset" aria-label="Add set">+</button></div>' +
      (open ? '<div class="wc-more">' + demo(ex) +
        '<input class="input" style="margin-top:10px" data-wf="note" value="' + esc(it.note || '') + '" placeholder="Note (e.g. 12 kg, 10-10-8)">' +
        (prev ? '<p class="muted small" style="margin:6px 0 0">Last time (' + fmtDate(prev.when) + '): ' + esc(prev.note) + '</p>' : '') +
        '<div class="btn-row" style="margin-top:10px"><button class="btn sm" data-act="ex" data-id="' + esc(it.ex) + '">' + I.video + ' Instructions & video</button>' +
        '<button class="btn sm" data-act="rmset">− Set</button><button class="btn sm danger" data-act="rm-witem">Remove</button></div></div>' : '') +
      '</div>';
  }).join('');
  h += '<button class="btn block" data-act="pick" data-target="session">' + I.plus + ' Add exercise</button>';
  h += '<div class="sep"></div><button class="btn block danger" data-act="discard">Discard workout</button>';
  h += '<div id="restbar-slot"></div>';
  return h;
}

function restBar() {
  const a = S.active;
  const slot = $('#restbar-slot');
  if (!slot) return;
  if (!a || !a.restEnd) { if (slot.innerHTML) slot.innerHTML = ''; return; }
  const left = a.restEnd - Date.now();
  if (left <= 0) {
    a.restEnd = null; save(); slot.innerHTML = '';
    beep(); toast('Rest over — next set!');
    return;
  }
  const t = fmtClock(left);
  const el = slot.querySelector('.t');
  if (el) { el.textContent = t; return; }
  slot.innerHTML = '<div class="restbar"><div class="grow"><div class="small" style="opacity:.7">Rest</div><div class="t">' + t + '</div></div>' +
    '<button class="btn" data-act="rest-add">+15s</button><button class="btn" data-act="rest-skip">Skip</button></div>';
}

// ---------------------------------------------------------------- summary
function sessionStats(s) {
  const total = s.items.reduce((n, it) => n + it.done.length, 0);
  const done = s.items.reduce((n, it) => n + it.done.filter(Boolean).length, 0);
  const full = s.items.filter(it => it.done.length && it.done.every(Boolean));
  const skipped = s.items.filter(it => !it.done.some(Boolean));
  const partial = s.items.filter(it => it.done.some(Boolean) && !it.done.every(Boolean));
  return { total, done, full, skipped, partial, pct: total ? Math.round(done / total * 100) : 0 };
}
function viewSummary(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return pageHead('Summary', { back: '#/history' }) + '<p class="muted">Session not found.</p>';
  const st = sessionStats(s);
  const L = loadOf(s.items);
  const planned = loadOf(s.items, true, true);
  const forgotten = ZONE_KEYS.filter(z => planned[z] && !L[z]);
  const L7 = rangeLoad(s.end - 7 * DAY);
  const miss7 = missingZones(L7);
  const fresh = UI.justFinished === id;

  let h = pageHead(fresh ? 'Workout complete' : s.name, { back: '#/history', sub: (fresh ? esc(s.name) + ' · ' : '') + fmtDate(s.start) + ', ' + fmtTime(s.start) + '–' + fmtTime(s.end) });
  h += '<div class="tiles"><div class="tile"><b>' + fmtClock(s.dur) + '</b><span>duration</span></div>' +
    '<div class="tile"><b>' + st.done + '/' + st.total + '</b><span>sets</span></div>' +
    '<div class="tile"><b>' + st.pct + '%</b><span>completed</span></div></div><div class="sep"></div>';

  if (st.skipped.length) h += '<div class="alert"><b>Exercises skipped (' + st.skipped.length + ')</b>' + st.skipped.map(it => esc(exName(it.ex))).join(', ') + '</div>';
  if (forgotten.length) h += '<div class="alert"><b>Planned but not trained</b>' + forgotten.map(z => ZONES[z]).join(', ') + '</div>';
  if (!st.skipped.length && !st.partial.length && st.total) h += '<div class="alert ok"><b>All done!</b>You completed every planned set.</div>';

  h += '<h2>Exercises</h2><div class="card flat list">' + s.items.map(it => {
    const k = it.done.filter(Boolean).length, n = it.done.length;
    const cls = n && k === n ? 'ok' : k ? 'part' : 'skip';
    const ic = cls === 'ok' ? I.check : cls === 'skip' ? I.x : k;
    return '<div class="res"><span class="ic ' + cls + '">' + ic + '</span><div class="grow"><div style="font-weight:600;font-size:15px">' + esc(exName(it.ex)) + '</div>' +
      '<div class="muted small">' + k + '/' + n + ' sets × ' + esc(it.reps || '—') + (it.note ? ' · ' + esc(it.note) : '') + '</div></div></div>';
  }).join('') + '</div>';

  h += '<h2>Muscles trained in this workout</h2><div class="card">' + bodyMap(L) + zoneGrid(L, false) + '</div>';
  h += '<h2>Last 7 days coverage</h2><div class="card">' + bodyMap(L7, { compact: true, caption: false }) + '</div>';
  h += miss7.length
    ? '<div class="alert"><b>Still to train this week</b>' + miss7.map(z => ZONES[z]).join(', ') + '</div>'
    : '<div class="alert ok"><b>Full week</b>Every area trained in the last 7 days.</div>';
  h += '<div class="sep"></div>' + (fresh ? '<a class="btn primary block" href="#/today">Done</a><div class="sep"></div>' : '') +
    '<button class="btn danger block" data-act="del-session" data-id="' + s.id + '">Delete session</button>';
  return h;
}

// ---------------------------------------------------------------- history
function viewHistory() {
  const now = Date.now();
  const sum = list => list.reduce((a, s) => a + s.dur, 0);
  const wk = S.sessions.filter(s => s.end >= startOfWeek(now));
  const mo = S.sessions.filter(s => s.end >= startOfMonth(now));
  let h = pageHead('History', { sub: S.sessions.length + ' workouts logged' });
  h += activeBanner();
  h += '<div class="tiles"><div class="tile"><b>' + fmtHours(sum(wk)) + '</b><span>week · ' + wk.length + '</span></div>' +
    '<div class="tile"><b>' + fmtHours(sum(mo)) + '</b><span>month · ' + mo.length + '</span></div>' +
    '<div class="tile"><b>' + fmtHours(sum(S.sessions)) + '</b><span>total · ' + S.sessions.length + '</span></div></div>';

  // Hours per week, last 8 weeks.
  const w0 = startOfWeek(now);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = w0 - (7 - i) * 7 * DAY, to = from + 7 * DAY;
    return { from, ms: sum(S.sessions.filter(s => s.end >= from && s.end < to)) };
  });
  const maxW = Math.max(1, ...weeks.map(w => w.ms));
  h += '<h2>Hours per week</h2><div class="card"><div class="weeks">' + weeks.map(w => {
    const d = new Date(w.from);
    return '<div class="week"><b>' + (w.ms ? (w.ms / 36e5).toLocaleString('en-GB', { maximumFractionDigits: 1 }) : '') + '</b>' +
      '<i class="' + (w.ms ? '' : 'zero') + '" style="height:' + (w.ms / maxW * 80) + 'px"></i><span>' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</span></div>';
  }).join('') + '</div></div>';

  const L30 = rangeLoad(now - 30 * DAY);
  if (S.sessions.length) h += '<h2>Muscles · last 30 days</h2><div class="card">' + bodyMap(L30, { compact: true }) + zoneGrid(L30) + '</div>';

  h += '<h2>Sessions</h2>';
  if (!S.sessions.length) return h + '<div class="card empty-state">Every workout will show up here with its duration and exercises.</div>';
  let month = '';
  for (const s of S.sessions) {
    const d = new Date(s.start);
    const m = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (m !== month) { if (month) h += '</div>'; month = m; h += '<p class="muted small" style="margin:14px 0 6px;text-transform:capitalize">' + m + '</p><div class="card flat list">'; }
    const st = sessionStats(s);
    h += '<button class="sess" data-act="open-session" data-id="' + s.id + '"><div class="date"><b>' + d.getDate() + '</b><span>' + DAYS[weekday(s.start)] + '</span></div>' +
      '<div class="grow"><div style="font-weight:600" class="ellipsis">' + esc(s.name) + '</div><div class="muted small">' + fmtDur(s.dur) + ' · ' + st.done + '/' + st.total + ' sets' + (st.skipped.length ? ' · <span style="color:var(--bad)">' + st.skipped.length + ' skipped</span>' : '') + '</div></div>' +
      '<span class="pct" style="color:' + (st.pct === 100 ? 'var(--ok)' : 'var(--muted)') + '">' + st.pct + '%</span></button>';
  }
  return h + '</div>';
}

// ---------------------------------------------------------------- sheets
function openSheet(html) {
  const w = $('#sheet');
  w.querySelector('.sheet').innerHTML = '<div class="grab"></div>' + html;
  w.hidden = false;
  w.querySelector('.sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  const w = $('#sheet');
  w.hidden = true;
  w.querySelector('.sheet').innerHTML = '';
  document.body.style.overflow = '';
}

function sheetExercise(id) {
  const ex = EX[id];
  if (!ex) return;
  const vid = S.videos[id] || ex.video || '';
  const yt = ytId(vid);
  let h = '<div class="sheet-head"><h3>' + esc(ex.n) + '</h3><button class="icon-btn" data-act="close" aria-label="Close">' + I.x + '</button></div>';
  h += demo(ex);
  if (yt) h += '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?playsinline=1&rel=0" title="Video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
  else if (vid) h += '<a class="btn block" style="margin-top:10px" href="' + esc(vid) + '" target="_blank" rel="noopener">' + I.video + ' Open your video</a>';
  h += '<div class="btn-row" style="margin-top:10px"><a class="btn" href="' + ytSearch(ex) + '" target="_blank" rel="noopener">' + I.video + ' Video on YouTube</a></div>';
  h += '<label class="field" style="margin-top:12px">Your reference video (YouTube link)<input class="input" id="vid" value="' + esc(S.videos[id] || '') + '" placeholder="https://youtu.be/…" inputmode="url"></label>';
  h += '<div class="chips" style="margin:4px 0 6px"><span class="chip tiny on">' + EQ[ex.eq] + '</span>' + (ex.b ? '<span class="chip tiny on">Bench</span>' : '') +
    (ex.lvl ? '<span class="chip tiny">' + LVL[ex.lvl] + '</span>' : '') + '<span class="chip tiny">' + (CAT[ex.cat] || 'Strength') + '</span></div>';
  h += '<h2>Muscles</h2>' + bodyMap(Object.fromEntries(ex.p.map(z => [z, 2]).concat(ex.s.map(z => [z, 1]))), { compact: true, caption: false }) +
    '<p class="small" style="margin:8px 0 0"><b>Primary:</b> ' + (ex.p.map(z => ZONES[z]).join(', ') || '—') + (ex.s.length ? '<br><b>Secondary:</b> ' + ex.s.map(z => ZONES[z]).join(', ') : '') + '</p>';
  if (ex.ins && ex.ins.length) h += '<h2>How to</h2><ol class="ins">' + ex.ins.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>';
  if (S.plans.length) {
    h += '<h2>Add to a plan</h2><div class="row"><select class="input grow" id="to-plan">' + S.plans.map(p => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') + '</select>' +
      '<button class="btn primary" data-act="add-to-plan" data-id="' + esc(id) + '">Add</button></div>';
  }
  if (ex.custom) h += '<div class="sep"></div><button class="btn danger block" data-act="del-ex" data-id="' + esc(id) + '">Delete custom exercise</button>';
  openSheet(h);
  const inp = $('#vid');
  inp.addEventListener('change', () => {
    const v = inp.value.trim();
    if (v) S.videos[id] = v; else delete S.videos[id];
    save(); sheetExercise(id);
  });
}

function sheetNewExercise() {
  let h = '<div class="sheet-head"><h3>New exercise</h3><button class="icon-btn" data-act="close" aria-label="Close">' + I.x + '</button></div>';
  h += '<label class="field">Name<input class="input" id="nx-name" placeholder="e.g. Australian pull-up"></label>';
  h += '<label class="field">Equipment<select class="input" id="nx-eq">' + Object.entries(EQ).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label>';
  h += '<label class="check"><input type="checkbox" id="nx-b"> Needs a bench</label>';
  h += '<div class="field">Primary muscles<div class="chips" id="nx-zones" style="margin-top:6px">' + ZONE_KEYS.map(z => '<button class="chip" data-act="nx-zone" data-z="' + z + '">' + ZONES[z] + '</button>').join('') + '</div></div>';
  h += '<label class="field">Video link (optional)<input class="input" id="nx-vid" placeholder="https://youtu.be/…" inputmode="url"></label>';
  h += '<button class="btn primary block" data-act="nx-save">Save exercise</button>';
  openSheet(h);
}

function sheetSettings() {
  let h = '<div class="sheet-head"><h3>Settings</h3><button class="icon-btn" data-act="close" aria-label="Close">' + I.x + '</button></div>';
  h += '<div class="field">Muscle map figure<div class="chips" style="margin-top:6px">' +
    ['male', 'female'].map(b => '<button class="chip' + (S.settings.body === b ? ' on' : '') + '" data-act="set-body" data-b="' + b + '">' + (b === 'male' ? 'Male' : 'Female') + '</button>').join('') + '</div></div>';
  h += '<label class="field">Default rest for new exercises (seconds)<input class="input" type="number" inputmode="numeric" id="set-rest" value="' + S.settings.rest + '" min="0" step="15"></label>';
  h += '<h2>Backup</h2><p class="muted small">Your data stays on this iPhone only. Export a backup now and then (e.g. to Files or iCloud Drive).</p>';
  h += '<div class="btn-row"><button class="btn" data-act="export">Export backup</button><label class="btn" style="position:relative">Import backup<input type="file" accept="application/json,.json" id="import" style="position:absolute;inset:0;opacity:0"></label></div>';
  h += '<div class="sep"></div><button class="btn danger block" data-act="wipe">Delete all data</button>';
  h += '<h2>Credits</h2><p class="muted small">Exercises and images: free-exercise-db (public domain). Body outlines: MuscleMap by Melih Colpan (MIT licence). Inspired by openGym.</p>';
  openSheet(h);
  $('#set-rest').addEventListener('change', e => { S.settings.rest = clamp(+e.target.value || 0, 0, 900); save(); });
  $('#import').addEventListener('change', importBackup);
}

// ---------------------------------------------------------------- actions
function newItem(exId) {
  const ex = EX[exId];
  const stretch = ex && ex.cat === 'stretching';
  return { uid: uid(), ex: exId, sets: stretch ? 2 : 3, reps: stretch ? '30s' : '10', rest: stretch ? 15 : S.settings.rest, note: '' };
}
function toWorkoutItem(it) {
  const n = clamp(+it.sets || 3, 1, 20);
  return { uid: uid(), ex: it.ex, reps: it.reps, rest: +it.rest || 0, note: it.note || '', done: Array(n).fill(false) };
}
function startWorkout(plan) {
  if (S.active && !confirm('A workout is already in progress (' + S.active.name + '). Discard it and start a new one?')) {
    go('#/workout'); return;
  }
  S.active = {
    id: uid(), planId: plan ? plan.id : null, name: plan ? plan.name : 'Free workout',
    start: Date.now(), pausedTotal: 0, pausedAt: null, restEnd: null,
    items: plan ? plan.items.map(toWorkoutItem) : [],
  };
  UI.open.clear();
  save();
  unlockAudio();
  go('#/workout');
}
function finishWorkout() {
  const a = S.active;
  const st = sessionStats(a);
  let msg = 'Finish the workout?';
  if (!st.done) msg = 'You haven\'t completed any sets. Save the workout anyway?';
  else if (st.skipped.length) msg = 'You skipped: ' + st.skipped.map(it => exName(it.ex)).join(', ') + '.\n\nFinish anyway?';
  else if (st.done < st.total) msg = 'You completed ' + st.done + ' of ' + st.total + ' sets. Finish anyway?';
  if (!confirm(msg)) return;
  const end = a.pausedAt || Date.now();
  const s = { id: a.id, planId: a.planId, name: a.name, start: a.start, end, dur: end - a.start - (a.pausedTotal || 0), items: a.items };
  S.sessions.unshift(s);
  S.sessions.sort((x, y) => y.start - x.start);
  S.active = null;
  save();
  releaseWakeLock();
  UI.justFinished = s.id;
  location.hash = '#/summary/' + s.id;
}

const SEED = [
  { name: 'Push · Chest, shoulders, triceps', days: [0], items: [['dumbbell-bench-press', 4, '8-10', 120], ['incline-dumbbell-press', 3, '10', 90], ['dumbbell-flyes', 3, '12', 60], ['arnold-dumbbell-press', 3, '10', 90], ['side-lateral-raise', 3, '12-15', 60], ['triceps-pushdown-rope-attachment', 3, '12', 60], ['ez-bar-skullcrusher', 3, '10', 60]] },
  { name: 'Pull · Back, biceps', days: [2], items: [['pullups', 4, 'max', 120], ['one-arm-dumbbell-row', 3, '10', 90], ['seated-cable-rows', 3, '12', 90], ['wide-grip-lat-pulldown', 3, '12', 90], ['face-pull', 3, '15', 60], ['ez-bar-curl', 3, '10', 60], ['hammer-curls', 3, '12', 60]] },
  { name: 'Legs & core', days: [4], items: [['dumbbell-squat', 4, '10', 120], ['romanian-deadlift', 3, '10', 120], ['split-squat-with-dumbbells', 3, '10 each leg', 90], ['butt-lift-bridge', 3, '15', 60], ['standing-dumbbell-calf-raise', 4, '15', 60], ['hanging-leg-raise', 3, '12', 60], ['russian-twist', 3, '20', 45], ['plank', 3, '45s', 45]] },
];
function seedPlans() {
  for (const p of SEED) {
    S.plans.push({ id: uid(), name: p.name, days: p.days, items: p.items.filter(([ex]) => EX[ex]).map(([ex, sets, reps, rest]) => ({ uid: uid(), ex, sets, reps, rest, note: '' })) });
  }
  save();
  toast('Created 3 example plans — edit them as you like');
  go('#/plans');
}

function exportBackup() {
  const data = JSON.stringify({ app: 'MyWorkout', version: 1, exported: new Date().toISOString(), ...S, active: S.active }, null, 1);
  const name = 'myworkout-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importBackup(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  f.text().then(t => {
    const j = JSON.parse(t);
    if (!j || !Array.isArray(j.plans) || !Array.isArray(j.sessions)) throw new Error('bad');
    if (!confirm('Replace your current data with this backup (' + j.plans.length + ' plans, ' + j.sessions.length + ' sessions)?')) return;
    const d = defaults();
    S = { ...d, plans: j.plans, sessions: j.sessions, active: j.active || null, custom: j.custom || [], videos: j.videos || {}, settings: { ...d.settings, ...(j.settings || {}) } };
    rebuildEx(); save(); closeSheet(); render(); toast('Backup imported');
  }).catch(() => toast('Invalid backup file'));
}

const actions = {
  close: () => closeSheet(),
  settings: () => sheetSettings(),
  seed: () => seedPlans(),
  free: () => startWorkout(null),
  start: el => startWorkout(S.plans.find(p => p.id === el.dataset.id)),
  'new-plan': () => {
    const p = { id: uid(), name: 'New plan', days: [], items: [] };
    S.plans.push(p); save(); location.hash = '#/plan/' + p.id;
  },
  day: el => {
    const p = curPlan(); const i = +el.dataset.i;
    p.days = (p.days || []).includes(i) ? p.days.filter(d => d !== i) : [...(p.days || []), i].sort();
    save(); render();
  },
  mv: el => {
    const p = curPlan(), i = p.items.findIndex(it => it.uid === el.closest('[data-uid]').dataset.uid), j = i + +el.dataset.d;
    if (j < 0 || j >= p.items.length) return;
    [p.items[i], p.items[j]] = [p.items[j], p.items[i]];
    save(); render();
  },
  'rm-item': el => {
    const p = curPlan(); const u = el.closest('[data-uid]').dataset.uid;
    p.items = p.items.filter(it => it.uid !== u); save(); render();
  },
  'dup-plan': () => {
    const p = curPlan();
    const c = { ...JSON.parse(JSON.stringify(p)), id: uid(), name: p.name + ' (copy)', days: [] };
    c.items.forEach(it => { it.uid = uid(); });
    S.plans.push(c); save(); location.hash = '#/plan/' + c.id;
  },
  'del-plan': () => {
    const p = curPlan();
    if (!confirm('Delete the plan "' + p.name + '"? Your workout history is kept.')) return;
    S.plans = S.plans.filter(x => x !== p); save(); location.hash = '#/plans';
  },
  pick: el => {
    UI.pick = { target: el.dataset.target, id: el.dataset.id || null, sel: new Set(), back: location.hash };
    go('#/exercises');
  },
  'pick-toggle': el => {
    const id = el.dataset.id, sel = UI.pick.sel;
    sel.has(id) ? sel.delete(id) : sel.add(id);
    const mark = el.querySelector('.pick-mark');
    mark.classList.toggle('on', sel.has(id)); mark.innerHTML = sel.has(id) ? I.check : '';
    const b = $('[data-act="pick-done"]');
    b.disabled = !sel.size; b.style.opacity = sel.size ? '' : '.5';
    b.textContent = 'Add ' + sel.size + ' exercise' + (sel.size === 1 ? '' : 's');
  },
  'pick-cancel': () => { const back = UI.pick.back; UI.pick = null; go(back); },
  'pick-done': () => {
    const { target, id, sel, back } = UI.pick;
    if (target === 'plan') {
      const p = S.plans.find(x => x.id === id);
      if (p) sel.forEach(ex => p.items.push(newItem(ex)));
    } else if (S.active) {
      sel.forEach(ex => { const it = toWorkoutItem(newItem(ex)); S.active.items.push(it); });
    }
    save(); toast(sel.size + ' exercise' + (sel.size === 1 ? '' : 's') + ' added');
    UI.pick = null; go(back);
  },
  'f-eq': el => { const k = el.dataset.k; UI.eq.has(k) ? UI.eq.delete(k) : UI.eq.add(k); render(); },
  'f-mine': () => { UI.mine = !UI.mine; render(); },
  ex: el => sheetExercise(el.dataset.id),
  'add-to-plan': el => {
    const p = S.plans.find(x => x.id === $('#to-plan').value);
    if (!p) return;
    p.items.push(newItem(el.dataset.id)); save(); closeSheet(); toast('Added to ' + p.name); render();
  },
  'new-ex': () => sheetNewExercise(),
  'nx-zone': el => el.classList.toggle('on'),
  'nx-save': () => {
    const n = $('#nx-name').value.trim();
    const zones = $$('#nx-zones .chip.on').map(c => c.dataset.z);
    if (!n) return toast('Give the exercise a name');
    if (!zones.length) return toast('Pick at least one muscle');
    const ex = { id: 'c-' + uid(), n, eq: $('#nx-eq').value, b: $('#nx-b').checked ? 1 : 0, cat: 'strength', lvl: '', p: zones, s: [], img: [], ins: [], custom: true };
    const v = $('#nx-vid').value.trim();
    S.custom.push(ex); if (v) S.videos[ex.id] = v;
    rebuildEx(); save(); closeSheet(); render(); toast('Exercise created');
  },
  'del-ex': el => {
    const id = el.dataset.id;
    if (!confirm('Delete this exercise? It will also be removed from your plans.')) return;
    S.custom = S.custom.filter(e => e.id !== id);
    S.plans.forEach(p => { p.items = p.items.filter(it => it.ex !== id); });
    delete S.videos[id];
    rebuildEx(); save(); closeSheet(); render();
  },
  // workout
  card: el => { const u = el.closest('[data-uid]').dataset.uid; UI.open.has(u) ? UI.open.delete(u) : UI.open.add(u); render(); },
  set: el => {
    unlockAudio();
    const it = wItem(el), i = +el.dataset.i;
    it.done[i] = !it.done[i];
    if (it.done[i] && +it.rest > 0 && !S.active.pausedAt) {
      const more = S.active.items.some(x => x.done.some(d => !d));
      if (more) S.active.restEnd = Date.now() + it.rest * 1000;
    } else if (!it.done[i]) S.active.restEnd = null;
    save(); render();
  },
  addset: el => { wItem(el).done.push(false); save(); render(); },
  rmset: el => { const it = wItem(el); if (it.done.length > 1) it.done.pop(); save(); render(); },
  'rm-witem': el => {
    const u = el.closest('[data-uid]').dataset.uid;
    S.active.items = S.active.items.filter(it => it.uid !== u); save(); render();
  },
  pause: () => {
    const a = S.active;
    if (a.pausedAt) { a.pausedTotal += Date.now() - a.pausedAt; a.pausedAt = null; }
    else { a.pausedAt = Date.now(); a.restEnd = null; }
    save(); render();
  },
  'rest-add': () => { S.active.restEnd += 15000; save(); restBar(); },
  'rest-skip': () => { S.active.restEnd = null; save(); restBar(); },
  finish: () => finishWorkout(),
  discard: () => {
    if (!confirm('Discard this workout? It won\'t be saved to your history.')) return;
    S.active = null; save(); releaseWakeLock(); location.hash = '#/today';
  },
  'open-session': el => { UI.justFinished = null; location.hash = '#/summary/' + el.dataset.id; },
  'del-session': el => {
    if (!confirm('Delete this session from your history?')) return;
    S.sessions = S.sessions.filter(s => s.id !== el.dataset.id); save(); location.hash = '#/history';
  },
  // settings
  'set-body': el => { S.settings.body = el.dataset.b; save(); sheetSettings(); render(); },
  export: () => exportBackup(),
  wipe: () => {
    if (!confirm('Delete ALL plans, history and custom exercises? This cannot be undone.')) return;
    S = defaults(); rebuildEx(); save(); closeSheet(); go('#/today');
  },
};
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function curPlan() { return S.plans.find(p => p.id === route().arg); }
function wItem(el) { const u = el.closest('[data-uid]').dataset.uid; return S.active.items.find(it => it.uid === u); }

document.addEventListener('click', e => {
  const za = e.target.closest('[data-zact]');
  if (za) { e.preventDefault(); zoomActions[za.dataset.zact](za); return; }
  const zt = e.target.closest('[data-zoom]');
  if (zt) { e.preventDefault(); e.stopPropagation(); openZoom(zt.dataset.zoom); return; }
  const zone = e.target.closest('.bm-m');
  if (zone) {
    const bm = zone.closest('.bm');
    const L = JSON.parse(bm.dataset.load || '{}'), z = zone.dataset.zone;
    $$('.bm-m.sel', bm).forEach(p => p.classList.remove('sel'));
    $$('.bm-m[data-zone="' + z + '"]', bm).forEach(p => p.classList.add('sel'));
    const cap = bm.querySelector('.bm-cap');
    if (cap) cap.innerHTML = '<b style="color:var(--text)">' + ZONES[z] + '</b> · ' + (L[z] ? fmtSets(L[z]) + ' sets' : 'not trained');
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') {
    UI.q = t.value; $('#exlist').innerHTML = exListHtml(); return;
  }
  if (t.dataset.planF) {
    const p = curPlan(); p[t.dataset.planF] = t.value;
    const h1 = $('.top h1'); if (h1) h1.textContent = t.value || 'Plan';
    saveSoon(); return;
  }
  if (t.dataset.f) {
    const p = curPlan(); const it = p && p.items.find(x => x.uid === t.closest('[data-uid]').dataset.uid);
    if (!it) return;
    it[t.dataset.f] = (t.dataset.f === 'sets' || t.dataset.f === 'rest') ? (t.value === '' ? '' : +t.value) : t.value;
    saveSoon(); return;
  }
  if (t.dataset.wf && S.active) {
    const it = wItem(t); it[t.dataset.wf] = t.value; saveSoon();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-zone') { UI.zone = t.value; render(); }
  if (t.id === 'f-bench') { UI.bench = t.value; render(); }
  if (t.id === 'f-cat') { UI.cat = t.value; render(); }
  if (t.dataset.f === 'sets') {
    const p = curPlan(); const it = p && p.items.find(x => x.uid === t.closest('[data-uid]').dataset.uid);
    if (it) { it.sets = clamp(+t.value || 1, 1, 20); t.value = it.sets; save(); }
  }
});

// ---------------------------------------------------------------- audio, wake lock, toast
let actx = null;
function unlockAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { actx = null; }
}
function beep() {
  if (!actx) return;
  try {
    const t0 = actx.currentTime;
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t0 + t);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.18);
      o.connect(g).connect(actx.destination);
      o.start(t0 + t); o.stop(t0 + t + 0.2);
    });
  } catch (e) { /* audio not available */ }
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* unsupported */ }
}

let wakeLock = null;
async function keepAwake() {
  if (wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
  catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* already released */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { save(); return; }
  if (route().name === 'workout') { keepAwake(); render(); }
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------------------------------------------------------------- router
function route() {
  const [name, arg] = (location.hash.replace(/^#\/?/, '') || 'today').split('/');
  return { name, arg: arg ? decodeURIComponent(arg) : '' };
}
function render() {
  const r = route();
  if (UI.pick && r.name !== 'exercises') UI.pick = null;
  const views = {
    today: viewToday, plans: viewPlans, plan: () => viewPlan(r.arg), exercises: viewLibrary,
    workout: viewWorkout, summary: () => viewSummary(r.arg), history: viewHistory,
  };
  const fn = views[r.name] || viewToday;
  const key = location.hash;
  const sameRoute = key === UI.lastRoute;
  const y = window.scrollY;
  $('#view').innerHTML = fn();
  const tab = ({ plan: 'plans', summary: 'history' }[r.name] || (views[r.name] ? r.name : 'today'));
  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  document.body.classList.toggle('no-tabs', r.name === 'workout' || !!UI.pick);
  if (sameRoute) window.scrollTo(0, y); else window.scrollTo(0, 0);
  UI.lastRoute = key;
  if (r.name === 'workout' && S.active) { keepAwake(); restBar(); } else releaseWakeLock();
}
window.addEventListener('hashchange', () => { closeZoom(); closeSheet(); render(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#zoom').hidden) closeZoom(); else closeSheet(); } });

setInterval(() => {
  if (!S.active) return;
  const t = fmtClock(elapsed());
  $$('[data-clock]').forEach(el => { if (el.textContent !== t) el.textContent = t; });
  if (route().name === 'workout') restBar();
}, 250);

render();
