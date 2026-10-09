// =====================================================================
//  API layer. The UI only talks to `Api`. To connect the real backend:
//    1. set USE_MOCK to false
//    2. set BASE_URL to your backend
//  Expected endpoints are listed in the comments of `Real` below.
// =====================================================================
const CONFIG = {
  USE_MOCK: true,
  BASE_URL: '/api',
  POLL_MS: 2000
};

// ---------------------------------------------------------------------
//  REAL BACKEND
//  POST /auth/login        { username, password } -> { token, user:{ name, role } }   role: "medical" | "lab" | "admin"
//  POST /auth/logout       (the backend writes the logout log)
//  GET  /rooms             -> [{ id, name, sensors:["temperature","humidity","sound","light"],
//                               temperature, humidity, sound, light, timestamp }]
//  GET  /alerts            -> [{ id, roomId, roomName, type, message, time, active, acknowledged }]
//  POST /alerts/:id/ack
//  GET  /audit-logs        -> [{ id, user, role, event:"login"|"logout", time }]   (admin only)
//  The backend must check the role on every endpoint. Hiding things in the UI is not security.
// ---------------------------------------------------------------------
const Real = (() => {
  let token = null;
  async function call(method, path, body) {
    const res = await fetch(CONFIG.BASE_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401 && path !== '/auth/login') { window.dispatchEvent(new Event('session-expired')); throw new Error('Session expired'); }
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { msg = (await res.json()).error || msg; } catch (e) {}
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  }
  return {
    setToken: t => { token = t; },
    login: async (username, password) => { const r = await call('POST', '/auth/login', { username, password }); token = r.token; return r; },
    logout: async () => { try { await call('POST', '/auth/logout'); } finally { token = null; } },
    rooms: () => call('GET', '/rooms'),
    alerts: () => call('GET', '/alerts'),
    ack: id => call('POST', '/alerts/' + encodeURIComponent(id) + '/ack'),
    logs: () => call('GET', '/audit-logs'),
    setOtLight: v => call('POST', '/ot/light', { value: v }),

  };
})();

// ---------------------------------------------------------------------
//  MOCK (simulated rooms, alerts and logs, for testing the UI)
//  Demo accounts: admin / admin123, medical / medical123, lab / lab123
// ---------------------------------------------------------------------
const Mock = (() => {
  const USERS = {
    admin:   { password: 'admin123',   role: 'admin' },
    medical: { password: 'medical123', role: 'medical' },
    lab:     { password: 'lab123',     role: 'lab' },
    ot:      { password: 'ot123',      role: 'ot' }
  };
  const VIEW = { admin: ['ward', 'ot', 'store'], medical: ['ward'], lab: ['store'], ot: ['ot'] };
  const ROOMS = [
    { id: 'ward',  name: 'Ward',              sensors: ['temperature', 'humidity', 'sound'] },
    { id: 'ot',    name: 'Operation Theatre', sensors: ['temperature', 'humidity'] },
    { id: 'store', name: 'Medicine Storage',  sensors: ['temperature', 'humidity', 'light'] }
  ];
  const BASE  = { temperature: 23, humidity: 48, sound: 20, light: 250 };
  const NOISE = { temperature: 1,  humidity: 4,  sound: 10, light: 60 };
  const SPIKE = { temperature: 30, humidity: 72, sound: 90, light: 800 };
  const OK = { temperature: [18, 26], humidity: [30, 60], sound: [0, 50], light: [0, 600] };
  const WORDS = { temperature: 'Temperature out of range', humidity: 'Humidity out of range', sound: 'Loud noise', light: 'Light too bright' };
  let otLight = 50;
  const spike = {};
  let alerts = [], alertSeq = 1, current = null;
  const logs = JSON.parse(localStorage.getItem('mockLogs') || '[]');
  const addLog = (user, role, event) => {
    logs.unshift({ id: Date.now() + Math.random(), user, role, event, time: new Date().toISOString() });
    localStorage.setItem('mockLogs', JSON.stringify(logs.slice(0, 100)));
  };
  const need = role => { if (!current || current.role !== role) throw new Error('Forbidden'); };

  function reading(room) {
    const r = { id: room.id, name: room.name, sensors: room.sensors, timestamp: new Date().toISOString() };
    room.sensors.forEach(s => {
      const k = room.id + s;
      if (!spike[k] && Math.random() < 0.012) spike[k] = 6;
      let v = BASE[s] + (Math.random() - .5) * 2 * NOISE[s];
      if (spike[k]) { v = SPIKE[s] + Math.random() * 10; spike[k]--; }
      r[s] = (s === 'temperature' || s === 'humidity') ? Math.round(v * 10) / 10 : Math.round(v);
    });
    return r;
  }

  function updateAlerts(rooms) {
    rooms.forEach(r => r.sensors.forEach(s => {
      const bad = r[s] < OK[s][0] || r[s] > OK[s][1];
      const open = alerts.find(a => a.roomId === r.id && a.type === s && a.active);
      if (bad && !open) {
        alerts.unshift({ id: 'a' + alertSeq++, roomId: r.id, roomName: r.name, type: s,
          message: WORDS[s] + ' in ' + r.name, time: new Date().toISOString(), active: true, acknowledged: false });
      } else if (!bad && open) open.active = false;
    }));
    alerts = alerts.slice(0, 30);
  }

  return {
    setToken: () => {},
    login: async (username, password) => {
      const u = USERS[username.toLowerCase()];
      if (!u || u.password !== password) throw new Error('Wrong username or password');
      current = { name: username.toLowerCase(), role: u.role };
      addLog(current.name, current.role, 'login');
      return { token: 'mock-' + current.name, user: { ...current } };
    },
    restore: user => { current = user; },
    logout: async () => { if (current) addLog(current.name, current.role, 'logout'); current = null; },
    rooms: async () => {
      const rooms = ROOMS.map(x => { const r = reading(x); if (x.id === 'ot') r.lightSet = otLight; return r; });
      updateAlerts(rooms);
      return rooms.filter(r => VIEW[current.role].includes(r.id));
    },
    alerts: async () => alerts.filter(a => VIEW[current.role].includes(a.roomId)).map(a => ({ ...a })),
    setOtLight: async v => { need('admin') ; otLight = v; },
    ack: async id => { const a = alerts.find(x => x.id === id); if (a) a.acknowledged = true; },
    logs: async () => { need('admin'); return logs.map(l => ({ ...l })); }
  };
})();

const Api = CONFIG.USE_MOCK ? Mock : Real;
