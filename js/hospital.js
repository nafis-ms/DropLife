(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const J = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- access guard: hospitals only ---------- */
  const P = J('lifedrop_profile'), U = J('lifedrop-user');
  if (!P || P.role !== 'hospital' || !U) { location.replace('index.html'); return; }

  const mkMe = (P, U) => {
    const D = P.details || {};
    return {
      name: D.suHName || ((P.firstName || '') + ' ' + (P.lastName || '')).trim() || 'Your hospital',
      contact: ((P.firstName || '') + ' ' + (P.lastName || '')).trim() || 'Not added',
      email: P.email || U.email || '',
      loc: D.suHLoc || 'Not added', hot: D.suHHot || 'Not added', lic: D.suHLic || 'Not provided',
      since: P.since || new Date().getFullYear()
    };
  };
  const me = mkMe(P, U);
  /* Storage is per account on this device (stands in for your database). */
  const K = k => 'ldh_' + k + '_' + (me.email || 'guest').toLowerCase();

  /* ---------- constants ---------- */
  const H = 36e5, DAY = 864e5, CAP = 80;
  const G = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const CL = ['#ff4d5e', '#ff8a5c', '#ffc15c', '#e5e66b', '#6be6a4', '#5cc8ff', '#8b7bff', '#e56bd6'];
  const gcol = g => CL[G.indexOf(g)];
  const REASONS = ['Surgery', 'Accident or trauma', 'Delivery or C-section', 'Thalassemia or anaemia', 'Cancer treatment', 'Dengue or infection'];
  const HOS = { lat: 23.7508, lng: 90.3912 }; /* demo location, Dhaka. Replace with this hospital's saved coordinates */
  const kmTo = (a, b) => { const r = x => x * Math.PI / 180, d = r(b.lat - a.lat), e = r(b.lng - a.lng), h = Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

  const OH = [['Labaid Specialized Hospital', 23.7392, 90.3818, 'Dhanmondi'], ['Square Hospitals', 23.7525, 90.3813, 'Panthapath'], ['Dhaka Medical College Hospital', 23.7259, 90.3977, 'Shahbagh'],
    ['Bangladesh Specialized Hospital', 23.7746, 90.3647, 'Shyamoli'], ['United Hospital', 23.8043, 90.4156, 'Gulshan'], ['Evercare Hospital', 23.8103, 90.4318, 'Bashundhara'],
    ['Ibn Sina Hospital', 23.7399, 90.3731, 'Dhanmondi'], ['Popular Medical Centre', 23.7455, 90.3737, 'Dhanmondi']]
    .map(([n, lat, lng, area]) => ({ n, lat, lng, area, km: +kmTo(HOS, { lat, lng }).toFixed(1) })).sort((a, b) => a.km - b.km);

  const mk = (list, key) => list.map(([n, g, a, b, ok], i) => { const o = { id: key + i, n, g, lat: HOS.lat + a, lng: HOS.lng + b, ok: ok !== 0 }; o.km = +kmTo(HOS, o).toFixed(1); return o; }).sort((x, y) => x.km - y.km);
  const DN = mk([['Rafiq H.', 'O+', .006, .011], ['Nadia S.', 'A+', -.012, .004], ['Sabbir A.', 'B+', .018, -.009], ['Tahmina K.', 'O-', -.004, -.016], ['Mahin R.', 'AB+', .025, .02, 0], ['Shuvo D.', 'B-', -.021, .013],
    ['Lamia I.', 'A-', .009, .028], ['Fahim M.', 'O+', -.03, -.006], ['Anika T.', 'B+', .014, .006], ['Jubayer C.', 'A+', .034, -.021, 0], ['Priya N.', 'AB-', -.017, -.027], ['Hasan Z.', 'O+', .002, -.004]], 'd');
  const RC = mk([['Mahbub A.', 'B+', .008, -.012], ['Sultana B.', 'B+', -.015, .009], ['Karim U.', 'O+', .02, .018], ['Rehana P.', 'A+', -.008, -.02], ['Abdul M.', 'O-', .012, .03], ['Shirin A.', 'AB-', -.025, .008],
    ['Jamal H.', 'B-', .03, -.015], ['Taslima B.', 'A-', -.01, -.03], ['Habibur R.', 'O+', .005, .016], ['Mina K.', 'AB+', -.02, .025]], 'c');

  const DIST = [312, 58, 246, 41, 98, 22, 421, 86], AVAIL = DIST.reduce((a, v) => a + v, 0), DREG = 3412;
  const RDIST = [72, 12, 96, 14, 26, 6, 78, 14], RAVAIL = RDIST.reduce((a, v) => a + v, 0), RREG = 1906;

  /* ---------- state ---------- */
  const ST = Object.assign({ lowAlert: true, msgAlert: true, calm: matchMedia('(prefers-reduced-motion: reduce)').matches, light: true }, J('ldh_set') || {});
  const saveS = () => W('ldh_set', ST);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dl = r => new Date(r.date + 'T23:59:59').getTime();
  const fd = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fs = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const left = ms => { const m = Math.max(0, Math.floor(ms / 6e4)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h < 24 ? h + ' h ' + (m % 60) + ' min' : Math.floor(h / 24) + ' d ' + (h % 24) + ' h'; };
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const num = n => Number(n).toLocaleString('en-US');
  const nk = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2800); };
  const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const lv = u => u === 0 ? ['low', 'Empty', '#ff4d5e'] : u < 10 ? ['low', 'Low', '#ff4d5e'] : u < 25 ? ['mid', 'Fair', '#e0a21a'] : ['ok', 'Good', '#2fbf7a'];

  /* blood bank */
  let STOCK = J(K('stock'));
  if (!Array.isArray(STOCK) || STOCK.length !== 8) { STOCK = P.provider === 'demo' ? [38, 6, 31, 0, 14, 3, 52, 9] : [0, 0, 0, 0, 0, 0, 0, 0]; W(K('stock'), STOCK); W(K('stockAt'), Date.now() - 3 * H); }
  let STOCKAT = J(K('stockAt')) || Date.now(), DRAFT = [...STOCK];

  /* confirmations: donors and receivers are stored separately */
  const seedD = () => P.provider !== 'demo' ? [] : [['Imran Hossain', 'imran.h@example.com', 'O+', '2026-10-24', 0, 'Regular donor.'], ['Farzana Ahmed', '+880 1711 220044', 'A+', '2026-10-19', 1, 'First donation, felt fine afterwards.'],
    ['Tanvir Rahman', 'tanvir.r@example.com', 'B+', '2026-10-11', 0, ''], ['Nusrat Jahan', '+880 1819 556677', 'O-', '2026-09-30', 0, 'Universal donor, came on short notice.'], ['Mizanur Khan', 'mizan.k@example.com', 'AB+', '2026-09-22', 1, ''],
    ['Sadia Islam', '+880 1912 334455', 'B-', '2026-09-08', 0, ''], ['Arif Chowdhury', 'arif.c@example.com', 'A-', '2026-08-27', 0, 'Walk-in.'], ['Moni Das', '+880 1515 667788', 'O+', '2026-08-12', 1, ''],
    ['Rubel Mia', 'rubel.m@example.com', 'B+', '2026-07-29', 0, '']].map(([name, contact, group, date, f, note], i) => ({ id: 'sd' + i, name, contact, group, date, first: !!f, note }));
  const seedR = () => P.provider !== 'demo' ? [] : [['Karim Uddin', 'B+', '+880 1711 998877', '2026-10-27', 'Accident case, 2 units.'], ['Rehana Parvin', 'O+', '+880 1812 445566', '2026-10-20', 'Delivery.'], ['Abdul Malek', 'A+', '+880 1913 112233', '2026-10-09', ''],
    ['Shirin Akter', 'AB-', '+880 1611 778899', '2026-09-26', 'Rare group, arranged from stock.'], ['Jamal Hossain', 'O-', '+880 1714 556600', '2026-09-14', ''], ['Taslima Begum', 'B-', '+880 1511 223344', '2026-08-30', 'Thalassemia, regular.'],
    ['Habibur Rahman', 'A-', '+880 1815 990011', '2026-08-05', ''], ['Mina Khatun', 'B+', '+880 1912 667700', '2026-07-18', '']].map(([name, group, phone, date, note], i) => ({ id: 'sr' + i, name, group, phone, date, note }));
  let CD = J(K('cd')), CR = J(K('cr'));
  if (!Array.isArray(CD)) { CD = seedD(); W(K('cd'), CD); }
  if (!Array.isArray(CR)) { CR = seedR(); W(K('cr'), CR); }

  /* ---------- the feed: demo "server" requests + real ones posted by receiver accounts on this device ---------- */
  const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261030);
  const FN = ['Aminul', 'Bilkis', 'Chandan', 'Dilruba', 'Eshita', 'Faruk', 'Golam', 'Hasina', 'Ismail', 'Jahanara', 'Kabir', 'Laila', 'Masud', 'Nargis', 'Omar', 'Parveen', 'Rashed', 'Salma', 'Tariq', 'Umme', 'Wahid', 'Yasmin', 'Zahid', 'Nasir'];
  const LN = ['Ahmed', 'Hossain', 'Rahman', 'Khan', 'Islam', 'Akter', 'Begum', 'Chowdhury', 'Mia', 'Sarkar', 'Uddin', 'Sheikh', 'Talukder', 'Bhuiyan', 'Mondal', 'Biswas', 'Roy', 'Das'];
  const GW = [22, 5, 28, 6, 9, 4, 34, 8];
  const pickG = () => { let x = rng() * GW.reduce((a, v) => a + v, 0); for (let i = 0; i < 8; i++) { x -= GW[i]; if (x < 0) return G[i]; } return 'O+'; };
  const SERVER = (() => {
    const out = [], t = Date.now(), pats = [];
    for (let i = 0; i < 150; i++) {
      let p;
      if (i > 118 && pats.length) p = pats[Math.floor(rng() * pats.length)]; /* the same patient posted again by another relative */
      else { p = { name: FN[Math.floor(rng() * FN.length)] + ' ' + LN[Math.floor(rng() * LN.length)], group: i < 8 ? G[i] : pickG() }; pats.push(p); } /* the first eight cover every blood type */
      const h = OH[Math.floor(rng() * OH.length)];
      out.push({ id: 's' + i, patient: p.name, group: p.group, hospital: h.n, loc: h.area + ', Dhaka', date: iso(t + Math.floor(rng() * 10) * DAY), reason: REASONS[Math.floor(rng() * REASONS.length)], note: '', made: t - Math.floor(rng() * 72) * H - Math.floor(rng() * 60) * 6e4 });
    }
    return out;
  })();
  const hashKm = n => 2 + (Math.abs([...n].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 100) / 10;
  const enrich = r => { const h = OH.find(x => x.n === r.hospital); return { ...r, km: h ? h.km : +hashKm(r.hospital).toFixed(1) }; };
  const liveReqs = () => {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('ldr_reqs_') === 0) { const a = J(k); if (Array.isArray(a)) a.forEach(r => out.push({ ...r, id: 'L' + i + r.id, live: true })); } } } catch (e) {}
    return out;
  };
  const feedAll = () => [...SERVER, ...liveReqs()].map(enrich).filter(r => dl(r) >= Date.now());
  /* a patient counts once, however many requests were posted for them */
  const patients = () => { const m = new Map(); feedAll().forEach(r => { const k = nk(r.patient); if (!m.has(k)) m.set(k, r); }); return m; };

  /* messages: donors and receivers are separate */
  let CV = J(K('msgs')) || (P.provider === 'demo' ? {
    donor: { d0: { n: 'Rafiq H.', g: 'O+', m: [{ x: 'Hello, I saw the urgent O+ request. I can come in this afternoon.', t: Date.now() - 5 * H }, { me: 1, x: 'Thank you. Please come to the blood bank on the 2nd floor.', t: Date.now() - 4.8 * H }] } },
    receiver: { c0: { n: 'Mahbub A.', g: 'B+', m: [{ x: 'Is B+ blood available for tomorrow morning?', t: Date.now() - 26 * H }, { me: 1, x: 'Yes, we have 31 units. Please bring the signed form.', t: Date.now() - 25 * H }] } }
  } : { donor: {}, receiver: {} });
  CV.donor = CV.donor || {}; CV.receiver = CV.receiver || {};
  const saveC = () => W(K('msgs'), CV);
  const REPLY = { donor: ['I can be there in about an hour.', 'Which entrance should I use?', 'Happy to help. Should I bring an ID?', 'Is the blood bank open this evening?'], receiver: ['Thank you, we will come as soon as possible.', 'Can you confirm the blood is reserved?', 'Which counter should we go to?', 'We are on our way, thank you.'] };

  let cur = 'dash', first = true, SEL = null;
  const FS = { sort: 'date', type: 'All', n: 12 }, HSORT = { d: { s: 'new', t: 'All' }, r: { s: 'new', t: 'All' } };
  const ACT = { donor: null, receiver: null }, SHOW = { d: true, r: true, h: true };
  let MAP = null, LAY = {}, MK = {}, lastFocus = null;

  const IC = {
    dash: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/>',
    bank: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9 14h6"/>',
    feed: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    msgs: '<path d="M4 5h16v11H9l-5 4z"/>',
    conf: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/>',
    prof: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    out: '<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'
  };
  const NAV = [['dash', 'Dashboard'], ['bank', 'Blood bank'], ['feed', 'Feed'], ['msgs', 'Messages'], ['conf', 'Confirmation'], ['hist', 'History'], ['prof', 'Profile'], ['set', 'Settings']];
  const TT = { dash: 'Dashboard', bank: 'Blood bank', feed: 'Request feed', msgs: 'Messages', conf: 'Confirmation', hist: 'History', set: 'Settings' };

  /* ---------- dashboard ---------- */
  const stockRows = () => G.map((g, i) => { const u = STOCK[i], [c, t, col] = lv(u); return `<div class="sr" style="--c:${col}"><span class="cg"><i style="background:${CL[i]};box-shadow:0 0 8px ${CL[i]}"></i>${g}</span><div class="tk"><div class="fl" style="--w:${Math.min(100, u / CAP * 100)}%"></div></div><b>${u}</b><em class="lv ${c}">${t}</em></div>`; }).join('');
  const stockAlert = () => {
    if (!ST.lowAlert) return '';
    const low = G.filter((g, i) => STOCK[i] < 10);
    return low.length ? `<div class="alert" role="status">${ic(IC.warn)}<div><b>Low stock: ${low.join(', ')}</b>Fewer than 10 units on hand. Update the blood bank or message nearby donors.</div></div>` : `<div class="alert fine" role="status">${ic(IC.conf)}<div><b>Stock looks healthy</b>Every blood type has 10 units or more.</div></div>`;
  };
  const distBar = (arr, label) => `<div class="dist" role="img" aria-label="${label}">${arr.map((v, i) => `<i style="--f:${v};--c:${CL[i]};--k:${i}" title="${G[i]}: ${v}"></i>`).join('')}</div>`;
  const topOf = arr => arr.map((v, i) => [G[i], v]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([g, v]) => `${g} ${num(v)}`).join(', ');

  function dash() {
    const pm = patients(), total = pm.size, reqs = feedAll().length, cnt = G.map(g => 0);
    pm.forEach(r => { cnt[G.indexOf(r.group)]++; });
    const mx = Math.max(...cnt, 1), top = G[cnt.indexOf(Math.max(...cnt))], units = STOCK.reduce((a, v) => a + v, 0);
    return `<section class="hero"><div><p class="eb">${greet()}</p><h2>${esc(me.name)}, <em>every unit counts.</em></h2></div><button type="button" class="btn" data-go="bank">Update blood bank</button></section>
<div class="grid">
<section class="card c4" style="--i:1"><h3>Donors available</h3><div class="num" data-n="${AVAIL}">0</div><p><span class="live"></span>of ${num(DREG)} registered on the server</p>${distBar(DIST, 'Available donors by blood group')}<small>Most available: ${topOf(DIST)}</small></section>
<section class="card c4" style="--i:2"><h3>Receivers available</h3><div class="num" data-n="${RAVAIL}">0</div><p><span class="live"></span>of ${num(RREG)} registered on the server</p>${distBar(RDIST, 'Available receivers by blood group')}<small>Most waiting: ${topOf(RDIST)}</small></section>
<section class="card c4" style="--i:3"><h3>Patients needing blood</h3><div class="num" data-n="${total}">0</div><p>Each patient is counted once</p><small>${num(reqs - total)} duplicate request${reqs - total === 1 ? '' : 's'} merged from ${num(reqs)} open requests</small></section>
<section class="card c7" style="--i:4"><h3>Your blood bank right now</h3><div class="srs">${stockRows()}</div><small class="cap">${num(units)} units in stock. Bars fill up to ${CAP} units.</small>${stockAlert()}</section>
<section class="card c5" style="--i:5"><h3>Patients by blood type</h3><div class="ch-l">${G.map((g, i) => `<div class="cr" style="--c:${CL[i]}"><span class="cg"><i></i>${g}</span><div class="tk"><div class="fl" style="--w:${cnt[i] / mx * 100}%"></div></div><b data-n="${cnt[i]}">0</b><small>${Math.round(cnt[i] / total * 100)}%</small></div>`).join('')}</div><small class="cap">Most needed right now: ${top} (${cnt[G.indexOf(top)]} patients)</small></section>
<section class="card c12 map" id="mapc" style="--i:6"><div class="mh"><h3>Live map</h3><div class="fchips tg" role="group" aria-label="Show on map">${[['d', 'Donors', '#ff4d5e'], ['r', 'Receivers', '#ffb020'], ['h', 'Hospitals', '#e11d34']].map(([k, t, c]) => `<button type="button" data-lay="${k}" class="${SHOW[k] ? 'on' : ''}" aria-pressed="${SHOW[k]}" style="--c:${c}"><i></i>${t}</button>`).join('')}</div></div><div class="lmap tall" id="lmap"></div><div class="lg"><span><i class="k you"></i>Your hospital</span><span><i class="k hos"></i>Other hospital</span><span><i class="k don"></i>Donor</span><span><i class="k rec"></i>Receiver</span></div><small class="mcap">Demo area: Dhaka. Markers show the nearest people and hospitals.</small></section>
</div>`;
  }

  /* ---------- map ---------- */
  const popup = (k, o) => `<div class="pp"><b>${esc(o.n)}</b>${o.g} ${k === 'd' ? 'donor' : 'receiver'} · ${o.km} km away<br>${o.ok ? `<button type="button" class="btn sm" data-mc="${k}" data-id="${o.id}">Message</button>` : '<small>Available soon</small>'}</div>`;
  function initMap() {
    const el = $('#lmap'); if (!el) return;
    if (!window.L) { el.innerHTML = '<p class="em" style="padding-top:150px">The map could not load. Check your connection.</p>'; return; }
    MAP = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${ST.light ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`, { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(MAP);
    L.marker([HOS.lat, HOS.lng], { icon: L.divIcon({ className: '', html: '<div class="rd"><i></i></div>', iconSize: [320, 320] }), interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(MAP);
    L.marker([HOS.lat, HOS.lng], { title: me.name, icon: L.divIcon({ className: '', html: '<div class="ud"></div>', iconSize: [16, 16] }), keyboard: false, zIndexOffset: 500 }).addTo(MAP).bindPopup(`<div class="pp"><b>${esc(me.name)}</b>Your hospital</div>`);
    LAY = { d: L.layerGroup(), r: L.layerGroup(), h: L.layerGroup() };
    DN.forEach((d, k) => L.marker([d.lat, d.lng], { title: d.n + ' · ' + d.g, icon: L.divIcon({ className: '', html: `<div class="dm${d.ok ? '' : ' off'}" style="--c:${gcol(d.g)};--k:${k}">${d.g}</div>`, iconSize: [30, 30] }) }).bindPopup(popup('d', d)).addTo(LAY.d));
    RC.forEach((r, k) => L.marker([r.lat, r.lng], { title: r.n + ' · ' + r.g, icon: L.divIcon({ className: '', html: `<div class="rm" style="--k:${k}"><span>${r.g}</span></div>`, iconSize: [26, 26] }) }).bindPopup(popup('r', r)).addTo(LAY.r));
    OH.forEach(h => L.marker([h.lat, h.lng], { title: h.n, icon: L.divIcon({ className: '', html: '<div class="mk"></div>', iconSize: [24, 24] }) }).bindPopup(`<div class="pp"><b>${esc(h.n)}</b>${h.km} km away · ${esc(h.area)}</div>`).addTo(LAY.h));
    Object.keys(LAY).forEach(k => { if (SHOW[k]) LAY[k].addTo(MAP); });
    /* Leaflet stops clicks inside popups, so the Message buttons are wired when a popup opens. */
    MAP.on('popupopen', e => { const b = e.popup.getElement().querySelector('[data-mc]'); if (b) b.onclick = () => openChat(b.dataset.mc === 'd' ? 'donor' : 'receiver', b.dataset.id); });
    MAP.fitBounds([[HOS.lat, HOS.lng], ...DN.slice(0, 5).map(d => [d.lat, d.lng]), ...RC.slice(0, 5).map(r => [r.lat, r.lng]), ...OH.slice(0, 2).map(h => [h.lat, h.lng])], { padding: [36, 36], animate: false });
    setTimeout(() => MAP && MAP.invalidateSize(), 1700);
  }

  /* ---------- blood bank ---------- */
  const dirtyN = () => G.filter((g, i) => DRAFT[i] !== STOCK[i]).length;
  const bankRow = (g, i) => { const u = DRAFT[i], [c, t, col] = lv(u); return `<div class="bbr${u !== STOCK[i] ? ' dirty' : ''}" data-row="${i}" style="--c:${col}"><span class="cg"><i style="background:${CL[i]};box-shadow:0 0 8px ${CL[i]}"></i>${g}</span><div class="tk"><div class="fl" style="--w:${Math.min(100, u / CAP * 100)}%"></div></div><div class="stp"><button type="button" data-st="-1" data-i="${i}" aria-label="Decrease ${g}">&minus;</button><input type="number" inputmode="numeric" min="0" max="9999" step="1" data-i="${i}" value="${u}" aria-label="${g} units"><button type="button" data-st="1" data-i="${i}" aria-label="Increase ${g}">+</button></div><div class="lvl"><em class="lv ${c}">${t}</em><span>${u !== STOCK[i] ? 'Saved: ' + STOCK[i] : 'Saved'}</span></div></div>`; };
  const bank = () => `<section class="card" style="--i:0"><div class="bsum"><div><small>Total units in stock</small><div class="num" id="bt" data-n="${DRAFT.reduce((a, v) => a + v, 0)}">0</div></div><div><small>Types running low</small><div class="num" id="bl" data-n="${DRAFT.filter(v => v < 10).length}">0</div></div><div><small>Last saved</small><p id="bu" style="margin:6px 0 0">${ago(STOCKAT)}</p></div></div><div class="bb">${G.map(bankRow).join('')}</div><small class="cap">Set a type to 0 if you have none. Bars fill up to ${CAP} units.</small></section>
<div class="savebar" id="sb" ${dirtyN() ? '' : 'hidden'}><span><b id="sbn">${dirtyN()}</b> unsaved change<span id="sbs">${dirtyN() === 1 ? '' : 's'}</span></span><div style="display:flex;gap:8px"><button type="button" class="btn g sm" data-reset>Discard</button><button type="button" class="btn sm" data-save>Save changes</button></div></div>`;
  function setVal(i, v, fromInput) {
    v = Math.max(0, Math.min(9999, Math.floor(+v) || 0)); DRAFT[i] = v;
    const r = $(`[data-row="${i}"]`); if (!r) return;
    const [c, t, col] = lv(v);
    r.style.setProperty('--c', col); $('.fl', r).style.setProperty('--w', Math.min(100, v / CAP * 100) + '%');
    if (!fromInput) $('input', r).value = v;
    const l = $('.lv', r); l.textContent = t; l.className = 'lv ' + c;
    r.classList.toggle('dirty', v !== STOCK[i]); $('.lvl span', r).textContent = v !== STOCK[i] ? 'Saved: ' + STOCK[i] : 'Saved';
    $('#bt').textContent = num(DRAFT.reduce((a, x) => a + x, 0)); $('#bl').textContent = DRAFT.filter(x => x < 10).length;
    const n = dirtyN(); $('#sb').hidden = !n; $('#sbn').textContent = n; $('#sbs').textContent = n === 1 ? '' : 's';
  }

  /* ---------- feed ---------- */
  const sortFeed = a => {
    const by = { date: (x, y) => dl(x) - dl(y) || y.made - x.made, type: (x, y) => G.indexOf(x.group) - G.indexOf(y.group) || dl(x) - dl(y), dist: (x, y) => x.km - y.km || dl(x) - dl(y) };
    return a.sort(by[FS.sort]);
  };
  const rq = (r, i) => {
    const ms = dl(r) - Date.now(), u = STOCK[G.indexOf(r.group)], dot = /[.!?]$/.test(r.reason) ? '' : '.';
    return `<article class="card rq" style="--i:${Math.min(i, 8) + 1}"><span class="gb s">${r.group}</span><div><h4>${esc(r.patient)}${r.live ? ' <span class="tag ok">New</span>' : ''}</h4><small>Posted ${ago(r.made)} · ${esc(r.hospital)}, ${esc(r.loc)}</small><p>${esc(r.reason)}${dot}${r.note ? ' ' + esc(r.note) : ''}</p><div class="tags"><span class="tag">${fd(r.date)}</span><span class="tag ${ms < DAY ? 'hot' : ''}">Closes in <span data-dl="${dl(r)}">${left(ms)}</span></span><span class="tag">${r.km} km away</span><span class="tag ${u ? 'ok' : 'low'}">${u ? `You have ${u} unit${u === 1 ? '' : 's'} of ${r.group}` : `No ${r.group} in stock`}</span></div></div><div class="acts"><button type="button" class="btn sm" data-hm="${r.id}">Message</button></div></article>`;
  };
  const feedList = () => {
    let a = feedAll(); if (FS.type !== 'All') a = a.filter(r => r.group === FS.type);
    a = sortFeed(a);
    const shown = a.slice(0, FS.n);
    return { n: a.length, html: shown.map(rq).join('') + (a.length > shown.length ? `<button type="button" class="btn g more" data-more>Show ${Math.min(12, a.length - shown.length)} more of ${a.length - shown.length}</button>` : '') || '<div class="card emp"><p>No open requests for this blood type.</p></div>' };
  };
  const feed = () => `<div class="sortbar"><span class="lab">Sort by</span><div class="fchips" role="group" aria-label="Sort requests">${[['date', 'Date'], ['type', 'Blood type'], ['dist', 'Distance']].map(([k, t]) => `<button type="button" data-sort="${k}" class="${FS.sort === k ? 'on' : ''}" aria-pressed="${FS.sort === k}">${t}</button>`).join('')}</div><label class="lab" for="ft">Show</label><select id="ft"><option value="All">All blood types</option>${G.map(g => `<option ${FS.type === g ? 'selected' : ''}>${g}</option>`).join('')}</select><span class="lab" id="fn"></span></div><div id="fl"></div>`;
  function paintFeed() { const f = feedList(); $('#fl').innerHTML = f.html; $('#fn').textContent = `${num(f.n)} open request${f.n === 1 ? '' : 's'}`; $$('[data-sort]').forEach(b => { const on = b.dataset.sort === FS.sort; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); $('#fl').classList.remove('in'); requestAnimationFrame(() => $('#fl').classList.add('in')); }

  /* ---------- messages: two cards ---------- */
  const catalog = k => (k === 'donor' ? DN : RC).map(o => ({ id: o.id, n: o.n, g: o.g }));
  const contacts = k => {
    const stored = Object.keys(CV[k]).map(id => ({ id, ...CV[k][id], last: (CV[k][id].m.slice(-1)[0] || {}).t || 0 })).filter(c => c.m.length).sort((a, b) => b.last - a.last);
    const rest = catalog(k).filter(c => !stored.find(s => s.id === c.id)).slice(0, 8).map(c => ({ ...c, m: [], last: 0 }));
    return [...stored, ...rest];
  };
  const clist = k => contacts(k).map(c => { const m = c.m.slice(-1)[0]; return `<button type="button" class="ct" data-ct="${c.id}"><span class="gb s">${c.g}</span><span class="rtx"><b>${esc(c.n)}</b><small>${m ? (m.me ? 'You: ' : '') + esc(m.x) : 'Start a conversation'}</small></span><span class="tm2">${m ? ago(m.t) : ''}</span></button>`; }).join('');
  const thread = k => { const c = CV[k][ACT[k]]; return `<div class="tb"><div class="thh"><button type="button" class="bk" data-bk aria-label="Back to ${k} list">&larr;</button><b>${esc(c.n)}</b><small>${c.g} ${k}</small></div><div class="ms">${c.m.map(m => `<div class="m ${m.me ? 'me' : ''}">${esc(m.x)}</div>`).join('') || '<p class="em" style="margin:auto">Say hello to ' + esc(c.n) + '.</p>'}</div><form class="cf" data-cf><input placeholder="Write a message…" autocomplete="off" aria-label="Message to ${esc(c.n)}"><button class="btn">Send</button></form></div>`; };
  const chatCard = (k, i) => `<section class="card cc" data-kind="${k}" style="--i:${i};--c:${k === 'donor' ? '#ff4d5e' : '#ffb020'}">${chatInner(k)}</section>`;
  const chatInner = k => `<div class="chd"><span class="dot"></span><h3>${k === 'donor' ? 'Donors' : 'Receivers'}</h3><small>${Object.values(CV[k]).filter(c => c.m.length).length} conversation${Object.values(CV[k]).filter(c => c.m.length).length === 1 ? '' : 's'}</small></div>${ACT[k] && CV[k][ACT[k]] ? thread(k) : `<div class="lst">${clist(k)}</div>`}`;
  const msgs = () => `<div class="duo">${chatCard('donor', 0)}${chatCard('receiver', 1)}</div>`;
  function paintCard(k, focus) {
    const c = $(`.cc[data-kind=${k}]`); if (!c) return;
    c.innerHTML = chatInner(k);
    const ms = $('.ms', c); if (ms) ms.scrollTop = 1e9;
    if (focus && $('.cf input', c)) $('.cf input', c).focus({ preventScroll: true });
    document.body.classList.toggle('inchat', cur === 'msgs' && innerWidth <= 900 && !!(ACT.donor || ACT.receiver));
  }
  function openChat(k, id, name, g) {
    const o = (k === 'donor' ? DN : RC).find(x => x.id === id);
    if (!CV[k][id]) CV[k][id] = { n: o ? o.n : name, g: o ? o.g : g, m: [] };
    ACT[k] = id; saveC();
    if (cur !== 'msgs') go('msgs'); else paintCard(k, true);
    setTimeout(() => { paintCard(k, true); const c = $(`.cc[data-kind=${k}]`); if (c && innerWidth <= 900) c.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 60);
  }

  /* ---------- confirmation ---------- */
  const gpick = () => `<fieldset class="fld" data-k="group"><legend>Blood type</legend><div class="bg8">${G.map(g => `<label><input type="radio" name="group" value="${g}"><span>${g}</span></label>`).join('')}</div><small class="fe"></small></fieldset>`;
  const recentRows = (a, kind) => a.length ? [...a].sort((x, y) => y.date.localeCompare(x.date) || (y.at || 0) - (x.at || 0)).slice(0, 3).map(x => hrow(x, kind)).join('') : '<p class="em" style="padding:10px 0">Nothing confirmed yet.</p>';
  const conf = () => `<div class="duo">
<section class="card" style="--i:0"><div class="hdr"><h3>Confirm a donor</h3><span class="badge">For a successful blood donation</span></div>
<form class="rform" id="fd" data-kind="d" novalidate>
<div class="fld"><label for="d-n">Full name</label><input id="d-n" name="name" autocomplete="off"><small class="fe"></small></div>
<div class="fld"><label for="d-c">Email or phone number</label><input id="d-c" name="contact" autocomplete="off" inputmode="email"><small class="fe"></small></div>
${gpick()}
<div class="fld"><label for="d-d">Date of donating blood</label><input id="d-d" name="date" type="date" max="${iso(Date.now())}" value="${iso(Date.now())}"><small class="fe"></small></div>
<fieldset class="fld" data-k="first"><legend>Is this their first time donating?</legend><div class="pill2"><label><input type="radio" name="first" value="yes"><span>First time</span></label><label><input type="radio" name="first" value="no"><span>Returning donor</span></label></div><small class="fe"></small></fieldset>
<div class="fld"><label for="d-q">Description <span style="font-weight:400">(optional)</span></label><textarea id="d-q" name="note" rows="3" placeholder="Anything worth recording"></textarea></div>
<button type="submit" class="btn">Confirm donor</button></form>
<div class="recent"><b>Recently confirmed donors</b><div class="hlist" id="rd" style="max-height:none">${recentRows(CD, 'd')}</div></div></section>
<section class="card" style="--i:1"><div class="hdr"><h3>Confirm a receiver</h3><span class="badge">For a patient who received blood</span></div>
<form class="rform" id="fr" data-kind="r" novalidate>
<div class="fld"><label for="r-n">Patient’s full name</label><input id="r-n" name="name" autocomplete="off"><small class="fe"></small></div>
${gpick()}
<div class="fld"><label for="r-p">Patient’s phone number</label><input id="r-p" name="phone" type="tel" inputmode="tel" autocomplete="off"><small class="fe"></small></div>
<div class="fld"><label for="r-q">Description <span style="font-weight:400">(optional)</span></label><textarea id="r-q" name="note" rows="3" placeholder="Units given, ward, or anything worth recording"></textarea></div>
<button type="submit" class="btn">Confirm receiver</button></form>
<div class="recent"><b>Recently confirmed receivers</b><div class="hlist" id="rr" style="max-height:none">${recentRows(CR, 'r')}</div></div></section></div>`;

  const setErr = (f, k, msg) => { const box = k === 'group' || k === 'first' ? $(`[data-k=${k}]`, f) : f.elements[k].closest('.fld'); box.classList.toggle('bad', !!msg); $('.fe', box).textContent = msg || ''; return msg ? (k === 'group' || k === 'first' ? $(`[name=${k}]`, f) : f.elements[k]) : null; };
  const okContact = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (/^[+\d][\d\s()\-]{6,}$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15);
  const okPhone = v => /^[+\d][\d\s()\-]{6,}$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15;
  function submitConf(f) {
    const e = f.elements, kind = f.dataset.kind, v = { name: e.name.value.trim(), group: ($('[name=group]:checked', f) || {}).value || '', note: e.note.value.trim() };
    const errs = [];
    errs.push(setErr(f, 'name', v.name ? '' : (kind === 'd' ? 'Enter the donor’s full name.' : 'Enter the patient’s full name.')));
    if (kind === 'd') {
      v.contact = e.contact.value.trim(); v.date = e.date.value; const fr = ($('[name=first]:checked', f) || {}).value;
      errs.push(setErr(f, 'contact', !v.contact ? 'Enter an email or phone number.' : okContact(v.contact) ? '' : 'Enter a valid email or phone number.'));
      errs.push(setErr(f, 'group', v.group ? '' : 'Select a blood type.'));
      errs.push(setErr(f, 'date', !v.date ? 'Pick the donation date.' : v.date > iso(Date.now()) ? 'The date cannot be in the future.' : ''));
      errs.push(setErr(f, 'first', fr ? '' : 'Choose one.')); v.first = fr === 'yes';
    } else {
      v.phone = e.phone.value.trim(); v.date = iso(Date.now());
      errs.push(setErr(f, 'group', v.group ? '' : 'Select a blood type.'));
      errs.push(setErr(f, 'phone', !v.phone ? 'Enter the patient’s phone number.' : okPhone(v.phone) ? '' : 'Enter a valid phone number.'));
    }
    const bad = errs.find(Boolean); if (bad) { bad.focus(); return; }
    const rec = { id: (kind === 'd' ? 'cd' : 'cr') + Date.now(), at: Date.now(), ...v };
    if (kind === 'd') { CD.unshift(rec); W(K('cd'), CD); $('#rd').innerHTML = recentRows(CD, 'd'); } else { CR.unshift(rec); W(K('cr'), CR); $('#rr').innerHTML = recentRows(CR, 'r'); }
    f.reset(); if (kind === 'd') f.elements.date.value = iso(Date.now());
    okShow(kind === 'd' ? 'Donor confirmed' : 'Receiver confirmed', kind === 'd' ? 'Saved to donor history.' : 'Saved to receiver history.');
  }

  /* ---------- history: two cards ---------- */
  const hrow = (x, kind) => `<div class="hrow"><span class="gb s">${x.group}</span><div><b>${esc(x.name)}${kind === 'd' && x.first ? '<span class="first">First time</span>' : ''}</b><small>${esc(kind === 'd' ? x.contact : x.phone)}</small>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div><span class="dt">${fs(x.date)}</span></div>`;
  const hsort = (a, st) => { const b = [...a].filter(x => st.t === 'All' || x.group === st.t); const nd = (x, y) => y.date.localeCompare(x.date) || (y.at || 0) - (x.at || 0); return b.sort(st.s === 'old' ? (x, y) => -nd(x, y) : st.s === 'type' ? (x, y) => G.indexOf(x.group) - G.indexOf(y.group) || nd(x, y) : nd); };
  const hlist = k => { const r = hsort(k === 'd' ? CD : CR, HSORT[k]); return r.length ? r.map(x => hrow(x, k)).join('') : '<p class="em">No records match.</p>'; };
  const hcard = (k, i) => `<section class="card" data-hk="${k}" style="--i:${i}"><div class="hdr"><h3>${k === 'd' ? 'Donor history' : 'Receiver history'}</h3><span class="badge" id="hc-${k}">${(k === 'd' ? CD : CR).length} record${(k === 'd' ? CD : CR).length === 1 ? '' : 's'}</span></div>
<div class="sortbar" style="margin-bottom:14px"><div class="fchips" role="group" aria-label="Sort ${k === 'd' ? 'donors' : 'receivers'}">${[['new', 'Newest'], ['old', 'Oldest'], ['type', 'Blood type']].map(([s, t]) => `<button type="button" data-hs="${s}" class="${HSORT[k].s === s ? 'on' : ''}" aria-pressed="${HSORT[k].s === s}">${t}</button>`).join('')}</div><select data-ht aria-label="Filter by blood type"><option value="All">All types</option>${G.map(g => `<option ${HSORT[k].t === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
<div class="hlist" id="hl-${k}">${hlist(k)}</div></section>`;
  const hist = () => `<p class="lead">Every confirmed donor and receiver is stored here with the date, in separate lists.</p><div class="duo">${hcard('d', 0)}${hcard('r', 1)}</div>`;
  function paintHist(k) {
    const c = $(`[data-hk=${k}]`); if (!c) return;
    $(`#hl-${k}`).innerHTML = hlist(k);
    $$('[data-hs]', c).forEach(b => { const on = b.dataset.hs === HSORT[k].s; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  }

  /* ---------- settings ---------- */
  const TG = [['dark', 'Dark mode', 'Switch to the dark cinematic look.'], ['calm', 'Reduce motion', 'Tone down animations and effects.'], ['lowAlert', 'Low stock alerts', 'Show a banner on the dashboard when a blood type drops under 10 units.'], ['msgAlert', 'Message alerts', 'Show a notice when a donor or receiver replies.']];
  const set = () => `<div id="acct"></div><section class="card" style="--i:2;max-width:720px">${TG.map(([k, t, d]) => `<label class="set sw"><div><b style="color:var(--t)">${t}</b><small>${d}</small></div><input type="checkbox" data-k="${k}" ${(k === 'dark' ? !ST.light : ST[k]) ? 'checked' : ''}><i></i></label>`).join('')}</section>`;

  const V = { dash, bank, feed, msgs, conf, hist, set };

  /* ---------- engine ---------- */
  const count = (root, delay) => $$('[data-n]', root).forEach(el => {
    const to = +el.dataset.n;
    if (ST.calm) { el.textContent = num(to); return; }
    let t0; const f = t => { t0 = t0 || t; const k = Math.min((t - t0) / 1200, 1); el.textContent = num(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); };
    setTimeout(() => requestAnimationFrame(f), delay);
  });
  const side = on => { $('#side').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); };
  function go(v) {
    if (cur === 'bank' && v !== 'bank' && dirtyN()) toast('Unsaved blood bank changes are kept. Return to save them.');
    cur = v;
    if (MAP) { MAP.remove(); MAP = null; } LAY = {};
    $$('#nav button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#ttl').textContent = TT[v];
    document.body.classList.remove('inchat');
    const el = $('#view'); el.classList.remove('in'); el.style.setProperty('--b', first ? '1.5s' : '0s');
    el.innerHTML = V[v]();
    if (v === 'set') LifeDropAccount.mount($('#acct'), { role: 'hospital', toast, onSaved: (p, u) => { Object.assign(me, mkMe(p, u)); $('#av').textContent = (me.name[0] || 'H').toUpperCase(); } });
    count(el, first ? 1500 : 150);
    if (v === 'dash') initMap();
    if (v === 'feed') paintFeed();
    first = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    history.replaceState(null, '', '#' + v); scrollTo(0, 0); side(false);
  }
  function okShow(t, p) {
    $('#okT').textContent = t; $('#okP').textContent = p;
    const o = $('#ok'); o.classList.add('on'); o.setAttribute('aria-hidden', 'false');
    setTimeout(() => { o.classList.remove('on'); o.setAttribute('aria-hidden', 'true'); }, ST.calm ? 700 : 1900);
  }

  /* ---------- profile modal ---------- */
  function openMod(html, label) { const m = $('#modal'); lastFocus = document.activeElement; m.innerHTML = html; m.firstElementChild.setAttribute('aria-label', label); m.classList.add('on'); m.setAttribute('aria-hidden', 'false'); setTimeout(() => { const f = $('.x', m); if (f) f.focus({ preventScroll: true }); }, 350); }
  function closeMod() { const m = $('#modal'); if (!m.classList.contains('on')) return; m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  function profile() {
    openMod(`<div class="card pc" role="dialog" aria-modal="true"><button type="button" class="x" data-x aria-label="Close">&times;</button><div class="pt"><span class="gb">${esc((me.name[0] || 'H').toUpperCase())}</span><div><h2>${esc(me.name)}</h2><small>Hospital · member since ${esc(me.since)}</small></div></div><div class="kv"><div class="w"><small>Hospital location</small>${esc(me.loc)}</div><div><small>Hotline</small>${esc(me.hot)}</div><div><small>Registration number</small>${esc(me.lic)}</div><div><small>Contact person</small>${esc(me.contact)}</div><div><small>Email</small>${esc(me.email)}</div><div><small>Blood units in stock</small>${num(STOCK.reduce((a, v) => a + v, 0))}</div><div><small>Types running low</small>${STOCK.filter(v => v < 10).length}</div><div><small>Donors confirmed</small>${CD.length}</div><div><small>Receivers confirmed</small>${CR.length}</div><div><small>Account type</small>${P.provider === 'demo' ? 'Demo hospital' : 'Hospital'}</div></div></div>`, 'Hospital profile');
  }

  /* ---------- events ---------- */
  $('#nav').innerHTML = NAV.map(([k, t]) => `<button type="button" data-v="${k}">${ic(IC[k])}<span>${t}</span></button>`).join('');
  $('#tabs').innerHTML = [['dash', 'Home'], ['bank', 'Blood bank'], ['feed', 'Feed'], ['msgs', 'Messages'], ['menu', 'Menu']].map(([k, t]) => `<button type="button" data-v="${k}">${ic(IC[k])}<span>${t}</span></button>`).join('');
  $('#logout').innerHTML = ic(IC.out) + '<span>Log out</span>';
  $('#av').textContent = (me.name[0] || 'H').toUpperCase();
  document.body.classList.toggle('calm', !!ST.calm);
  const theme = () => { document.documentElement.classList.toggle('light', !!ST.light); const m = $('meta[name=theme-color]'); if (m) m.content = ST.light ? '#fff8f8' : '#0b0508'; };
  theme();

  $('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v === 'prof') { side(false); profile(); return; } go(b.dataset.v); });
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v === 'menu') return side(true); go(b.dataset.v); });
  $('#logout').onclick = () => { try { localStorage.removeItem('lifedrop-user'); } catch (e) {} document.body.classList.add('out'); setTimeout(() => { location.href = 'index.html'; }, 500); };
  $('#burger').onclick = () => side(true);
  $('#scrim').onclick = () => side(false);
  $('#av').onclick = profile;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if ($('#modal').classList.contains('on')) closeMod(); else side(false); return; }
    const m = $('#modal'); if (e.key !== 'Tab' || !m.classList.contains('on')) return;
    const f = $$('button:not([disabled]),a[href]', m); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  $('#modal').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('[data-x]')) closeMod(); });

  $('#view').addEventListener('click', e => {
    const q = s => e.target.closest(s); let x;
    if ((x = q('[data-go]'))) return go(x.dataset.go);
    if ((x = q('[data-lay]'))) { const k = x.dataset.lay; SHOW[k] = !SHOW[k]; x.classList.toggle('on', SHOW[k]); x.setAttribute('aria-pressed', SHOW[k]); if (MAP && LAY[k]) SHOW[k] ? LAY[k].addTo(MAP) : MAP.removeLayer(LAY[k]); return; }
    if ((x = q('[data-sort]'))) { FS.sort = x.dataset.sort; FS.n = 12; return paintFeed(); }
    if (q('[data-more]')) { FS.n += 12; return paintFeed(); }
    if ((x = q('[data-hm]'))) { const r = feedAll().find(y => y.id === x.dataset.hm); if (r) openChat('receiver', 'q' + r.id, r.patient, r.group); return; }
    /* blood bank */
    if ((x = q('[data-st]'))) { const i = +x.dataset.i; return setVal(i, DRAFT[i] + +x.dataset.st); }
    if (q('[data-reset]')) { DRAFT = [...STOCK]; return go('bank'); }
    if (q('[data-save]')) {
      STOCK = [...DRAFT]; STOCKAT = Date.now(); W(K('stock'), STOCK); W(K('stockAt'), STOCKAT);
      const low = G.filter((g, i) => STOCK[i] < 10); toast(ST.lowAlert && low.length ? `Saved. Low stock: ${low.join(', ')}` : 'Blood bank saved'); return go('bank');
    }
    /* chat */
    const cc = q('.cc');
    if (cc) {
      const k = cc.dataset.kind;
      if ((x = q('[data-ct]'))) { ACT[k] = x.dataset.ct; if (!CV[k][ACT[k]]) { const o = catalog(k).find(c => c.id === ACT[k]); CV[k][ACT[k]] = { n: o.n, g: o.g, m: [] }; } return paintCard(k, true); }
      if (q('[data-bk]')) { ACT[k] = null; return paintCard(k); }
    }
    if ((x = q('[data-hs]'))) { const k = x.closest('[data-hk]').dataset.hk; HSORT[k].s = x.dataset.hs; return paintHist(k); }
  });
  $('#view').addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'ft') { FS.type = t.value; FS.n = 12; return paintFeed(); }
    if (t.matches('[data-ht]')) { const k = t.closest('[data-hk]').dataset.hk; HSORT[k].t = t.value; return paintHist(k); }
    const k = t.dataset.k; if (k && t.type === 'checkbox') {
      if (k === 'dark') ST.light = !t.checked; else ST[k] = t.checked;
      saveS(); if (k === 'calm') document.body.classList.toggle('calm', ST.calm); if (k === 'dark') theme(); toast('Setting saved');
    }
  });
  $('#view').addEventListener('input', e => {
    const t = e.target;
    if (t.matches('.stp input')) return setVal(+t.dataset.i, t.value, true);
    const box = t.closest('.fld'); if (box && t.closest('.rform')) { box.classList.remove('bad'); const fe = $('.fe', box); if (fe) fe.textContent = ''; }
  });
  $('#view').addEventListener('focusout', e => { if (e.target.matches('.stp input')) e.target.value = DRAFT[+e.target.dataset.i]; });
  $('#view').addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    if (f.matches('.rform')) return submitConf(f);
    if (f.matches('[data-cf]')) {
      const cc = f.closest('.cc'), k = cc.dataset.kind, id = ACT[k], i = $('input', f), x = i.value.trim(); if (!x || !id) return;
      CV[k][id].m.push({ me: 1, x, t: Date.now() }); saveC(); paintCard(k, true);
      setTimeout(() => { const c = $(`.cc[data-kind=${k}] .ms`); if (ACT[k] === id && cur === 'msgs' && c) { c.insertAdjacentHTML('beforeend', '<div class="m ty"><i></i><i></i><i></i></div>'); c.scrollTop = 1e9; } }, 500);
      setTimeout(() => { CV[k][id].m.push({ x: REPLY[k][Math.random() * REPLY[k].length | 0], t: Date.now() }); saveC(); if (ACT[k] === id && cur === 'msgs') paintCard(k); else if (ST.msgAlert) toast(CV[k][id].n + ' replied'); }, 1900);
    }
  });
  document.addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } });
  setInterval(() => { $$('[data-dl]').forEach(el => { el.textContent = left(+el.dataset.dl - Date.now()); }); }, 30000);

  const h0 = location.hash.slice(1);
  go(V[h0] ? h0 : 'dash');
})();
