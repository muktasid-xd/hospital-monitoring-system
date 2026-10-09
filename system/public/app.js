// =====================================================================
//  RBAC: each role maps to a list of permissions. Sections in index.html
//  carry data-perm="..." and are hidden when the user lacks that permission.
//  The backend must enforce the same rules; this only shapes the screen.
// =====================================================================
const ROLES = {
  medical: { label: 'Ward In-charge',              perms: ['alerts', 'sound', 'env'] },
  lab:     { label: 'Storage In-charge',           perms: ['env'] },
  ot:      { label: 'Operation Theatre In-charge', perms: ['alerts', 'env', 'ot'] },
  admin:   { label: 'Admin',                       perms: ['alerts', 'overview', 'logs', 'ot'] }
};
// Safe ranges (match the Arduino thresholds; could also come from the backend)
const LIMITS = {
  temperature: { label: 'Temperature', unit: '°C', min: 18, max: 26,  digits: 1 },
  humidity:    { label: 'Humidity',    unit: '%',  min: 30, max: 60,  digits: 1 },
  sound:       { label: 'Sound level', unit: '',   min: 0,  max: 50,  digits: 0, scale: 200 },
  light:       { label: 'Light level', unit: '',   min: 0,  max: 600, digits: 0, scale: 1023 }
};

// ---------- State ----------
const $ = id => document.getElementById(id);
let user = null;
let rooms = [], alerts = [], logs = [];
let selectedRoom = null;
let online = true;
let knownAlerts = null;      // null until the first alerts load (no toasts for old alerts)
let pollTimer = null;

const can = p => !!user && ROLES[user.role].perms.includes(p);

// ---------- Small DOM helpers (textContent only, safe for backend text) ----------
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function dots() {
  const s = h('span', 'dots');
  s.setAttribute('aria-hidden', 'true');
  s.append(h('i', 'dot red'), h('i', 'dot green'));
  return s;
}
const fmtTime = iso => new Date(iso).toLocaleTimeString();
const fmtDate = iso => new Date(iso).toLocaleString();

function stateOf(metric, v) {
  if (!online || typeof v !== 'number') return 'idle';
  const l = LIMITS[metric];
  return (v < l.min || v > l.max) ? 'bad' : 'ok';
}
const stateWord = s => ({ ok: 'Normal', bad: 'Problem', idle: 'No data' }[s]);

function card(label, value, unit, state, extra) {
  const c = h('div', 'card');
  c.dataset.state = state;
  const top = h('div', 'card-top');
  top.append(h('div', 'label', label), dots());
  const val = h('div', 'value', value);
  val.append(h('span', 'unit', unit));
  c.append(top, val);
  if (extra) c.append(extra);
  c.append(h('div', 'state-text', stateWord(state)));
  return c;
}
function meter(pct) {
  const m = h('div', 'meter');
  const f = h('div', 'fill');
  f.style.width = Math.max(0, Math.min(100, pct)) + '%';
  m.append(f);
  return m;
}
const num = (metric, v) => typeof v === 'number' ? v.toFixed(LIMITS[metric].digits) : '--';

// ---------- Login / logout ----------
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('login-error').textContent = '';
  try {
    const r = await Api.login($('user').value.trim(), $('pass').value);
    sessionStorage.setItem('auth', JSON.stringify(r));
    start(r.user);
  } catch (err) {
    $('login-error').textContent = 'Could not sign in: ' + err.message + '.';
  }
});

async function signOut() {
  clearInterval(pollTimer);
  try { await Api.logout(); } catch (e) { console.error(e); }
  sessionStorage.removeItem('auth');
  location.reload();
}
$('logout').addEventListener('click', signOut);
window.addEventListener('session-expired', () => { sessionStorage.removeItem('auth'); location.reload(); });

// ---------- Notifications ----------
function toast(text) {
  const t = h('div', 'toast', text);
  $('toasts').append(t);
  setTimeout(() => t.remove(), 7000);
}
$('enable-notify').addEventListener('click', async () => {
  if ('Notification' in window) await Notification.requestPermission();
  $('enable-notify').classList.add('hidden');
});
function notifyNew(list) {
  if (knownAlerts === null) { knownAlerts = new Set(list.map(a => a.id)); return; }
  list.forEach(a => {
    if (knownAlerts.has(a.id)) return;
    knownAlerts.add(a.id);
    if (!a.active) return;
    toast(a.message);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Hospital alert', { body: a.message });
    }
  });
}

// ---------- Room picker (medical and lab roles) ----------
function pickerRooms() {
  if (can('sound')) return rooms.filter(r => r.sensors.includes('sound'));
  return rooms.filter(r => r.sensors.some(s => s !== 'sound'));
}
function renderPicker() {
  const sec = $('sec-picker');
  const showPicker = (can('sound') || can('env')) && !can('overview');
  sec.classList.toggle('hidden', !showPicker);
  if (!showPicker) return;
  const list = pickerRooms();
  if (!list.some(r => r.id === selectedRoom)) selectedRoom = list[0] ? list[0].id : null;
  const sel = $('room-select');
  if (sel.options.length !== list.length) {
    sel.innerHTML = '';
    list.forEach(r => sel.append(new Option(r.name, r.id)));
  }
  sel.value = selectedRoom;
}
$('room-select').addEventListener('change', e => { selectedRoom = e.target.value; render(); });

// ---------- Sections ----------
function renderSound() {
  const box = $('sound-cards');
  box.innerHTML = '';
  const r = rooms.find(x => x.id === selectedRoom);
  if (!r) { box.append(h('p', 'muted', 'No room with a sound sensor yet.')); return; }
  const st = stateOf('sound', r.sound);
  const l = LIMITS.sound;
  const m = meter(typeof r.sound === 'number' ? (r.sound / l.scale) * 100 : 0);
  const c = card(r.name, num('sound', r.sound), '', st, m);
  c.append(h('div', 'muted', 'Safe up to ' + l.max));
  box.append(c);
}

function renderEnv() {
  const box = $('env-cards');
  box.innerHTML = '';
  const r = rooms.find(x => x.id === selectedRoom);
  if (!r) { box.append(h('p', 'muted', 'No room selected.')); return; }
  ['light', 'temperature', 'humidity'].forEach(s => {
    if (!r.sensors.includes(s)) return;
    const l = LIMITS[s];
    const st = stateOf(s, r[s]);
    const c = card(l.label, num(s, r[s]), l.unit, st);
    c.append(h('div', 'muted', 'Safe range: ' + l.min + ' to ' + l.max + ' ' + l.unit));
    box.append(c);
    if (s === 'light') {
      const pct = typeof r.light === 'number' ? Math.round((r.light / l.scale) * 100) : null;
      const b = card('Brightness', pct === null ? '--' : String(pct), '%', st, meter(pct || 0));
      b.append(h('div', 'muted', 'Share of the sensor\'s full scale'));
      box.append(b);
    }
  });
}

function roomStatus(r) {
  if (!online) return 'idle';
  return r.sensors.some(s => stateOf(s, r[s]) === 'bad') ? 'bad' : 'ok';
}
function renderOverview() {
  const body = $('overview-body');
  body.innerHTML = '';
  rooms.forEach(r => {
    const tr = h('tr');
    tr.append(h('td', '', r.name));
    ['temperature', 'humidity', 'light', 'sound'].forEach(s => {
      let t = '–';
      if (r.sensors.includes(s)) t = num(s, r[s]) + (LIMITS[s].unit ? ' ' + LIMITS[s].unit : '');
      else if (s === 'light' && typeof r.lightSet === 'number') t = r.lightSet + '% (set)';
      tr.append(h('td', '', t));
    });
    const st = roomStatus(r);
    const td = h('td');
    td.dataset.state = st;
    td.append(dots(), h('span', 'state-text', stateWord(st)));
    tr.append(td);
    body.append(tr);
  });
}

function renderAlerts() {
  const ul = $('alerts-list');
  ul.innerHTML = '';
  const unack = alerts.filter(a => a.active && !a.acknowledged).length;
  $('bell-count').textContent = unack;
  if (!alerts.length) { ul.append(h('li', 'muted', 'No alerts. Everything is normal.')); return; }
  alerts.slice(0, 12).forEach(a => {
    const li = h('li');
    li.dataset.state = a.active && !a.acknowledged ? 'bad' : (a.active ? 'idle' : 'ok');
    li.append(dots());
    const txt = h('div', 'grow');
    txt.append(h('div', '', a.message), h('div', 'muted', fmtDate(a.time) + (a.active ? ' · Active' : ' · Resolved') + (a.acknowledged ? ' · Acknowledged' : '')));
    li.append(txt);
    if (a.active && !a.acknowledged) {
      const b = h('button', 'btn small', 'Acknowledge');
      b.addEventListener('click', async () => { await Api.ack(a.id); await poll(); });
      li.append(b);
    }
    ul.append(li);
  });
}

function renderLogs() {
  const body = $('logs-body');
  body.innerHTML = '';
  logs.slice(0, 30).forEach(l => {
    const tr = h('tr');
    tr.append(h('td', '', fmtDate(l.time)), h('td', '', l.user), h('td', '', (ROLES[l.role] || {}).label || l.role), h('td', '', h('td', '', l.event === 'login' ? 'Signed in' : l.event === 'logout' ? 'Signed out' : l.event)));
    body.append(tr);
  });
  if (!logs.length) { const tr = h('tr'); const td = h('td', 'muted', 'No activity yet.'); td.colSpan = 4; tr.append(td); body.append(tr); }
}

let otDrag = false, otTimer = null;
function renderOT() {
  const r = rooms.find(x => x.id === 'ot');
  if (!r || typeof r.lightSet !== 'number') { $('ot-value').textContent = '--'; return; }
  $('ot-value').textContent = r.lightSet;
  if (!otDrag) $('ot-slider').value = r.lightSet;
}
$('ot-slider').addEventListener('input', e => {
  otDrag = true;
  $('ot-value').textContent = e.target.value;
  clearTimeout(otTimer);
  otTimer = setTimeout(async () => {
    try {
      await Api.setOtLight(Number(e.target.value));
      $('ot-msg').textContent = 'Light set to ' + e.target.value + '%';
    } catch (err) { $('ot-msg').textContent = 'Failed: ' + err.message; }
    otDrag = false;
  }, 300);
});

function render() {
  $('conn').classList.toggle('hidden', online);
  $('bell').classList.toggle('hidden', !can('alerts'));
  renderPicker();
  if (can('sound')) renderSound();
  if (can('env')) renderEnv();
  if (can('ot')) renderOT();
  if (can('overview')) renderOverview();
  if (can('alerts')) renderAlerts();
  if (can('logs')) renderLogs();
}

// ---------- Polling ----------
async function poll() {
  try {
    const jobs = [];
    if (can('sound') || can('env') || can('overview')) jobs.push(Api.rooms().then(d => { rooms = d; }));
    if (can('alerts')) jobs.push(Api.alerts().then(d => { alerts = d; notifyNew(d); }));
    if (can('logs')) jobs.push(Api.logs().then(d => { logs = d; }));
    await Promise.all(jobs);
    online = true;
  } catch (err) {
    console.error('poll failed:', err.message);
    online = false;
  }
  render();
}

// ---------- Start ----------
function start(u) {
  if (!u || !ROLES[u.role]) {
    sessionStorage.removeItem('auth');
    $('login-error').textContent = 'This account has no valid role. Contact the admin.';
    return;
  }
  user = u;
  if (Api.restore) Api.restore(u);
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('role-badge').textContent = ROLES[u.role].label;
  $('who').textContent = u.name;
  document.querySelectorAll('[data-perm]').forEach(s => s.classList.toggle('hidden', !can(s.dataset.perm)));
  if (can('alerts') && 'Notification' in window && Notification.permission === 'default') $('enable-notify').classList.remove('hidden');
  poll();
  pollTimer = setInterval(poll, CONFIG.POLL_MS);
}

if (CONFIG.USE_MOCK) {
  const hint = $('demo-hint');
  hint.textContent = 'Demo mode. admin / admin123, medical / medical123, lab / lab123';
  hint.classList.remove('hidden');
}

const saved = sessionStorage.getItem('auth');
if (saved) {
  const a = JSON.parse(saved);
  if (!CONFIG.USE_MOCK) Real.setToken(a.token);
  start(a.user);
}
