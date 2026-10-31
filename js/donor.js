(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const J = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = J('lifedrop_profile'), U = J('lifedrop-user');
  if (!P || P.role !== 'donor' || !U) { location.replace('index.html'); return; }

  /* ---------- data ---------- */
  const D = P.details || {}, G = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const CAN = { 'O-': G, 'O+': ['O+', 'A+', 'B+', 'AB+'], 'A-': ['A-', 'A+', 'AB-', 'AB+'], 'A+': ['A+', 'AB+'], 'B-': ['B-', 'B+', 'AB-', 'AB+'], 'B+': ['B+', 'AB+'], 'AB-': ['AB-', 'AB+'], 'AB+': ['AB+'] };
  const ST = Object.assign({ alerts: true, loc: true, calm: false, light: true, sort: 'time', avail: D.available !== false }, J('ld_set') || {});
  const HIST = P.provider === 'demo' ? [
    { d: '2026-06-18', h: 'Square Hospitals', u: 1 }, { d: '2026-02-09', h: 'Dhaka Medical College Hospital', u: 1 },
    { d: '2025-10-03', h: 'United Hospital', u: 1 }, { d: '2025-05-21', h: 'BSMMU Blood Bank', u: 1 },
    { d: '2025-01-12', h: 'Evercare Hospital', u: 1 }, { d: '2024-09-02', h: 'Labaid Specialized Hospital', u: 1 }
  ] : (P.history || []);
  const mkMe = (P, U) => {
    const D = P.details || {};
    return {
      first: P.firstName || U.name || 'Donor', name: ((P.firstName || '') + ' ' + (P.lastName || '')).trim() || U.name || 'Donor',
      email: P.email || U.email || '', group: D.donorGroup || 'O+', phone: D.suDPhone || 'Not added',
      addr: [D.suDStreet, D.suDDistrict, D.suDCity, D.suDCountry].filter(Boolean).join(', ') || 'Not added', since: P.since || new Date().getFullYear()
    };
  };
  const me = mkMe(P, U);
  const H = 36e5, now = Date.now();
  const FEED = [
    { id: 1, n: 'Tasnim Rahman', g: 'O+', u: 2, h: 'Square Hospitals', km: 2.4, due: 2, ago: 12, urg: 2, x: 'Post-surgery patient needs blood urgently.' },
    { id: 2, n: 'Imran Hossain', g: 'A+', u: 1, h: 'United Hospital', km: 5.1, due: 6, ago: 40, urg: 1, x: 'Dengue patient, transfusion support needed.' },
    { id: 3, n: 'Farzana Akter', g: 'O-', u: 3, h: 'Dhaka Medical College', km: 3.8, due: 1.5, ago: 8, urg: 2, x: 'Emergency C-section, rare blood group.' },
    { id: 4, n: 'Rashed Karim', g: 'B+', u: 2, h: 'Labaid Hospital', km: 1.6, due: 20, ago: 130, urg: 0, x: 'Scheduled surgery tomorrow morning.' },
    { id: 5, n: 'Mitu Sultana', g: 'AB+', u: 1, h: 'Evercare Hospital', km: 6.3, due: 30, ago: 200, urg: 0, x: 'Thalassemia patient, regular transfusion.' },
    { id: 6, n: 'Arif Chowdhury', g: 'O+', u: 1, h: 'Bangladesh Specialized', km: 4.2, due: 9, ago: 55, urg: 1, x: 'Accident victim recovering, needs one bag.' },
    { id: 7, n: 'Nusrat Jahan', g: 'A-', u: 2, h: 'Popular Medical', km: 7.9, due: 48, ago: 300, urg: 0, x: 'Cancer patient preparing for chemotherapy.' }
  ].map(f => ({ ...f, at: now + f.due * H }));
  const ME = { lat: 23.7461, lng: 90.3742 }; /* demo location: Dhanmondi, Dhaka. Replace with the donor's saved location */
  const kmTo = (a, b) => { const r = x => x * Math.PI / 180, d = r(b.lat - a.lat), e = r(b.lng - a.lng), h = Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  /* Registered hospitals (demo list). Replace with your backend data. */
  const HS = [{ n: 'Labaid Specialized Hospital', lat: 23.7392, lng: 90.3818 }, { n: 'Square Hospitals', lat: 23.7525, lng: 90.3813 }, { n: 'Dhaka Medical College Hospital', lat: 23.7259, lng: 90.3977 },
    { n: 'Bangladesh Specialized Hospital', lat: 23.7746, lng: 90.3647 }, { n: 'United Hospital', lat: 23.8043, lng: 90.4156 }, { n: 'Evercare Hospital', lat: 23.8103, lng: 90.4318 }]
    .map(h => ({ ...h, km: +kmTo(ME, h).toFixed(1) })).sort((a, b) => a.km - b.km);
  let MAP = null, MK = [];
  const MO = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const DATA = [[38, 6, 24, 4, 11, 2, 45, 9], [42, 7, 27, 5, 13, 3, 48, 11], [35, 5, 22, 4, 10, 2, 40, 8], [47, 8, 30, 6, 14, 3, 52, 12], [44, 7, 28, 5, 12, 3, 50, 10], [52, 9, 33, 6, 16, 4, 58, 13]];
  const CL = ['#ff4d5e', '#ff8a5c', '#ffc15c', '#e5e66b', '#6be6a4', '#5cc8ff', '#8b7bff', '#e56bd6'];
  const REPLY = ['Thank you so much, I really appreciate it.', 'Please come to the blood bank counter when you arrive.', 'May you be blessed. We will be waiting for you.'];
  let CV = J('ld_msgs') || { 1: { n: 'Tasnim Rahman', g: 'O+', m: [{ x: 'Assalamu alaikum, thank you for responding.' }, { x: 'Can you reach Square Hospitals today?' }] } };
  let act = null, cur = 'dash', first = true;

  /* ---------- helpers ---------- */
  const fd = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const du = h => h < 1 ? Math.round(h * 60) + ' min' : h < 24 ? (Math.round(h * 10) / 10) + ' h' : Math.round(h / 24) + ' d';
  const ag = m => m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
  const cmp = g => g === me.group ? 2 : CAN[me.group].includes(g) ? 1 : 0;
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const save = () => W('ld_msgs', CV);
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2600); };
  const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const NAV = [['dash', 'Dashboard', '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/>'], ['feed', 'Feed', '<path d="M4 5h16M4 12h16M4 19h10"/>'],
    ['msgs', 'Messages', '<path d="M4 5h16v11H9l-5 4z"/>'], ['hist', 'History', '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/>'],
    ['prof', 'Profile', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'],
    ['set', 'Settings', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>']];
  const TT = { dash: 'Dashboard', feed: 'Blood requests', msgs: 'Messages', hist: 'Donation history', set: 'Settings' };

  function elig() {
    const ds = HIST[0] ? Math.floor((Date.now() - new Date(HIST[0].d)) / 864e5) : ({ 'Within the last 3 months': 45, '3 to 6 months ago': 135, 'More than 6 months ago': 220 })[D.suDLast];
    if (ds == null) return { ok: true, p: 1, left: 0, last: 'Never', next: '' };
    const left = Math.max(0, 90 - ds);
    return { ok: !left, p: Math.min(ds / 90, 1), left, last: HIST[0] ? fd(HIST[0].d) : D.suDLast, next: fd(Date.now() + left * 864e5) };
  }

  /* ---------- views ---------- */
    const mapInfo = i => { const h = HS[i]; return `<b>${h.n}</b><small>${h.km} km away · about ${Math.round(h.km * 3.5)} min by car</small><a class="dir" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}">Directions</a>`; };

  const MF = ['May', 'June', 'July', 'August', 'September', 'October'].map(m => m + ' 2026');
  let SEL = MO.length - 1;
  const tot = j => DATA[j].reduce((a, v) => a + v, 0);
  const delta = j => { if (!j) return 'First month shown'; const d = tot(j) - tot(j - 1); return `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(Math.round(d / tot(j - 1) * 100))}%</span> vs ${MO[j - 1]}`; };
  const tween = (el, a, b) => { el.dataset.n = b; const t0 = performance.now(), f = t => { const k = Math.min((t - t0) / 700, 1); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
  function chartHTML() {
    const j = SEL, t = tot(j), mx = Math.max(...DATA[j]), mt = Math.max(...DATA.map((_, k) => tot(k)));
    return `<section class="card c7 chart" style="--i:4"><div class="ch-h"><h3>Blood donated through <b>LifeDrop</b></h3><label class="sel"><span>Month</span><select id="mo" aria-label="Select month">${MF.map((m, k) => `<option value="${k}" ${k === j ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
<div class="ch-b"><div class="ch-t"><small>Total donated · units</small><div class="num" id="mt" data-n="${t}">0</div><p class="dl" id="md">${delta(j)}</p><div class="mini">${DATA.map((_, k) => `<button type="button" data-m="${k}" class="${k === j ? 'on' : ''}" aria-label="${MF[k]}"><i style="--h:${tot(k) / mt}"></i><span>${MO[k]}</span></button>`).join('')}</div></div>
<div class="ch-l">${G.map((g, i) => `<div class="cr ${g === me.group ? 'mine' : ''}" data-r="${i}" style="--c:${CL[i]}"><span class="cg"><i></i>${g}${g === me.group ? ' <em class="you">You</em>' : ''}</span><div class="tk"><div class="fl" style="--w:${DATA[j][i] / mx * 100}%"></div></div><b data-n="${DATA[j][i]}">0</b><small>${Math.round(DATA[j][i] / t * 100)}%</small></div>`).join('')}</div></div></section>`;
  }
  function setMonth(j) {
    if (j === SEL) return;
    const p = SEL, t = tot(j), mx = Math.max(...DATA[j]); SEL = j;
    $('#mo').value = j;
    $$('.mini button').forEach((b, k) => b.classList.toggle('on', k === j));
    tween($('#mt'), tot(p), t); $('#md').innerHTML = delta(j);
    DATA[j].forEach((v, i) => { const r = $(`[data-r="${i}"]`); $('.fl', r).style.setProperty('--w', v / mx * 100 + '%'); tween($('b', r), DATA[p][i], v); $('small', r).textContent = Math.round(v / t * 100) + '%'; });
  }

  function dash() {
    const e = elig(), n = HIST.length, units = HIST.reduce((a, h) => a + (h.u || 1), 0), ms = [1, 5, 10, 25].find(m => m > n) || n;
    const urg = FEED.filter(f => f.urg === 2).sort((a, b) => a.at - b.at).slice(0, 3);
    const recv = G.filter(x => CAN[x].includes(me.group));
    return `<section class="hero"><div><p class="eb">${greet()}</p><h2>${esc(me.first)}, <em>every drop</em> counts.</h2></div><span class="gb">${me.group}</span></section>
<div class="grid">
<section class="card c4" style="--i:1"><h3>Fit to donate?</h3><div class="ringw"><svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" style="--v:${e.p}"/></svg><div class="rc"><b>${e.ok ? 'Ready' : e.left}</b><small>${e.ok ? 'to donate' : 'days left'}</small></div></div><p class="st ${e.ok ? 'ok' : 'wait'}">${e.ok ? 'You are fit to donate again' : 'Next donation on ' + e.next}</p><small>Last donation: ${esc(e.last)} · 90-day gap</small></section>
<section class="card c4" style="--i:2"><h3>Times donated</h3><div class="num" data-n="${n}">0</div><p>About <b data-n="${n * 3}">0</b> lives impacted · ${units} unit${units === 1 ? '' : 's'}</p><div class="bar2"><i style="--w:${Math.min(100, n / ms * 100)}%"></i></div><small>${n >= 25 ? 'Top milestone reached' : (ms - n) + ' more to reach ' + ms + ' donations'}</small></section>
<section class="card c4" style="--i:3"><h3>Urgent patients</h3>${urg.map(f => `<div class="row" data-chat="${f.id}"><span class="gb s">${f.g}</span><div><b>${esc(f.n)}</b><small>${esc(f.h)} · ${f.km} km</small></div><span class="tm">${du(f.due)}</span></div>`).join('')}<button class="btn g" data-go="feed" style="width:100%;margin-top:4px">See all requests</button></section>
${chartHTML()}
<section class="card c5 map" style="--i:5"><h3>Nearest donation hospitals</h3><div class="lmap" id="lmap"></div><div class="hl">${HS.map((h, i) => `<button data-h="${i}" class="${i ? '' : 'on'}">${esc(h.n.split(' ')[0])} · ${h.km} km</button>`).join('')}</div><div class="hi" id="hi">${mapInfo(0)}</div></section>
<section class="card c4" style="--i:6"><h3>Who you can help</h3><small>You can donate to</small><div class="chips">${CAN[me.group].map(g => `<span class="${g === me.group ? 'me' : ''}">${g}</span>`).join('')}</div><small>You can receive from</small><div class="chips">${recv.map(g => `<span class="${g === me.group ? 'me' : ''}">${g}</span>`).join('')}</div></section>
<section class="card c4" style="--i:7"><h3>Donor badges</h3><div class="bd">${[['First Drop', 1], ['Hero', 3], ['Lifesaver', 5], ['Legend', 10]].map(([t, k]) => `<div class="${n >= k ? '' : 'lock'}"><b>${k}</b>${t}</div>`).join('')}</div></section>
<section class="card c4" style="--i:8"><h3>Before you donate</h3><ul class="tips"><li>Drink plenty of water the day before.</li><li>Eat an iron-rich meal 3 to 4 hours earlier.</li><li>Rest well and carry a photo ID.</li></ul></section>
</div>`;
  }

  const posts = () => {
    const a = [...FEED], s = ST.sort;
    a.sort(s === 'near' ? (x, y) => x.km - y.km : s === 'type' ? (x, y) => cmp(y.g) - cmp(x.g) || x.at - y.at : (x, y) => x.at - y.at);
    return a.map((f, i) => `<article class="card post" style="--i:${i}"><span class="gb s">${f.g}</span><div><b>${esc(f.n)}</b> <small>needs ${f.u} unit${f.u > 1 ? 's' : ''} · posted ${ag(f.ago)}</small><p>${esc(f.x)}</p><div class="tags"><span class="tag ${f.urg === 2 ? 'hot' : ''}">Needed in ${du(f.due)}</span><span class="tag">${esc(f.h)} · ${f.km} km</span><span class="tag ${cmp(f.g) ? 'ok' : ''}">${['Not compatible', 'Compatible', 'Exact match'][cmp(f.g)]}</span></div></div><button class="btn" data-chat="${f.id}">Message</button></article>`).join('');
  };
  const feed = () => `<div class="pills">${[['time', 'Donating time'], ['type', 'My blood type'], ['near', 'Nearest receiver']].map(([k, t]) => `<button data-s="${k}" class="${ST.sort === k ? 'on' : ''}">${t}</button>`).join('')}</div><div id="fl">${posts()}</div>`;

  const lastMsg = id => { const m = CV[id].m.slice(-1)[0]; return m ? (m.me ? 'You: ' : '') + m.x : 'Say hello'; };
  const clist = () => Object.keys(CV).map(id => `<button data-c="${id}" class="${id == act ? 'on' : ''}"><span class="gb s">${CV[id].g}</span><div><b>${esc(CV[id].n)}</b><small>${esc(lastMsg(id))}</small></div></button>`).join('') || '<p class="em">No conversations yet.</p>';
  const thread = () => { const c = CV[act]; return `<div class="thh"><button class="bk" data-bk aria-label="Back">&larr;</button><b>${esc(c.n)}</b><small>needs ${c.g}</small></div><div class="ms" id="ms">${c.m.map(m => `<div class="m ${m.me ? 'me' : ''}">${esc(m.x)}</div>`).join('')}</div><form class="cf" id="cf"><input id="ci" placeholder="Write a message…" autocomplete="off" aria-label="Message"><button class="btn">Send</button></form>`; };
  const EMPTY = '<p class="em" style="margin:auto">Select a conversation, or message a receiver from the Feed.</p>';
  function msgs() {
    if (!act && innerWidth > 900) act = Object.keys(CV)[0] || null;
    return `<div class="card chat ${act ? 'open' : ''}" style="--i:0"><div class="cl">${clist()}</div><div class="th">${act ? thread() : EMPTY}</div></div>`;
  }
  function paintChat(focus) {
    const c = $('.chat'); if (!c) return;
    c.classList.toggle('open', !!act);
    $('.cl', c).innerHTML = clist(); $('.th', c).innerHTML = act ? thread() : EMPTY;
    const ms = $('#ms'); if (ms) ms.scrollTop = 1e9;
    if (focus && $('#ci')) $('#ci').focus({ preventScroll: true });
  }

  function hist() {
    const n = HIST.length, units = HIST.reduce((a, h) => a + (h.u || 1), 0);
    const st = [['Total donations', n], ['Units given', units], ['Lives impacted', n * 3]].map(([t, v], i) => `<section class="card c4" style="--i:${i}"><h3>${t}</h3><div class="num" data-n="${v}">0</div></section>`).join('');
    return `<div class="grid">${st}</div>` + (n ? `<div class="tl" style="margin-top:24px">${HIST.map((h, i) => `<div class="card ev" style="--i:${i + 3}"><span class="gb s">${me.group}</span><div><b>${esc(h.h)}</b><small>${fd(h.d)} · ${h.u || 1} unit whole blood</small></div><span class="tag ok">Completed</span></div>`).join('')}</div>` : '<div class="card em" style="margin-top:18px">No donations recorded yet. Your first donation will appear here.</div>');
  }

  const TG = [['avail', 'Available to donate', 'Show me to hospitals and patients nearby.'], ['alerts', 'Urgent request alerts', 'Notify me when a matching blood request is posted.'],
    ['loc', 'Share approximate location', 'Used to sort requests and hospitals by distance.'], ['dark', 'Dark Mode', 'Switch to the dark cinematic look.'], ['calm', 'Reduce motion', 'Tone down animations and effects.']];
  const set = () => `<div id="acct"></div><section class="card" style="--i:2;max-width:720px">${TG.map(([k, t, d]) => `<label class="set sw"><div><b style="color:var(--t)">${t}</b><small>${d}</small></div><input type="checkbox" data-k="${k}" ${(k === 'dark' ? !ST.light : ST[k]) ? 'checked' : ''}><i></i></label>`).join('')}</section>`;

  const V = { dash, feed, msgs, hist, set };

  /* ---------- engine ---------- */
  const count = (root, delay) => $$('[data-n]', root).forEach(el => {
    let t0;
    const f = t => { t0 = t0 || t; const k = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(+el.dataset.n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); };
    setTimeout(() => requestAnimationFrame(f), delay);
  });
  const side = on => { $('#side').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); };
  const pick = i => {
    $$('[data-h]').forEach(e => e.classList.toggle('on', +e.dataset.h === i));
    $('#hi').innerHTML = mapInfo(i);
    if (MAP) {
      MK.forEach((m, j) => { const el = m.getElement(); if (el && el.firstChild) el.firstChild.classList.toggle('on', j === i); });
      MAP.fitBounds([[ME.lat, ME.lng], [HS[i].lat, HS[i].lng]], { padding: [50, 50], maxZoom: 15 });
    }
  };
  function initMap() {
    const el = $('#lmap'); if (!el) return;
    if (!window.L) { el.innerHTML = '<p class="em">The map could not load. Check your connection.</p>'; return; }
    MAP = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${ST.light ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`, { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(MAP);
    L.circle([ME.lat, ME.lng], { radius: 3000, color: '#6be6a4', weight: 1, fillOpacity: .05, interactive: false }).addTo(MAP);
    L.marker([ME.lat, ME.lng], { icon: L.divIcon({ className: '', html: '<div class="ud"></div>', iconSize: [16, 16] }), interactive: false, keyboard: false }).addTo(MAP);
    MK = HS.map((h, i) => L.marker([h.lat, h.lng], { title: h.n, icon: L.divIcon({ className: '', html: `<div class="mk${i ? '' : ' on'}"></div>`, iconSize: [24, 24] }) }).on('click', () => pick(i)).addTo(MAP));
    MAP.fitBounds(L.latLngBounds([[ME.lat, ME.lng]].concat(HS.slice(0, 3).map(h => [h.lat, h.lng]))), { padding: [36, 36] });
    setTimeout(() => MAP && MAP.invalidateSize(), 1700);
  }

  function go(v) {
    cur = v;
    if (MAP) { MAP.remove(); MAP = null; MK = []; }
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#ttl').textContent = TT[v];
    const el = $('#view');
    el.classList.remove('in');
    el.style.setProperty('--b', first ? '1.5s' : '0s');
    el.innerHTML = V[v]();
    if (v === 'set') LifeDropAccount.mount($('#acct'), { role: 'donor', toast, onSaved: (p, u) => { Object.assign(me, mkMe(p, u)); $('#av').textContent = (me.first[0] || 'D').toUpperCase(); } });
    count(el, first ? 1500 : 150);
    if (v === 'dash') initMap();
    first = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    history.replaceState(null, '', '#' + v);
    scrollTo(0, 0); side(false);
    if (v === 'msgs') { const ms = $('#ms'); if (ms) ms.scrollTop = 1e9; }
  }
  function openChat(id) {
    const f = FEED.find(x => x.id == id);
    if (!f) return;
    CV[id] = CV[id] || { n: f.n, g: f.g, m: [] };
    act = String(id); save(); go('msgs');
  }
  function profile() {
    const e = elig(), n = HIST.length, m = $('#modal');
    m.innerHTML = `<div class="card pc" role="dialog" aria-modal="true" aria-label="Donor profile"><button class="x" data-x aria-label="Close">&times;</button><div class="pt"><span class="gb">${me.group}</span><div><h2>${esc(me.name)}</h2><small>Donor · member since ${esc(me.since)}</small></div></div><div class="kv"><div><small>Email</small>${esc(me.email)}</div><div><small>Phone</small>${esc(me.phone)}</div><div><small>Blood group</small>${me.group}</div><div><small>Status</small>${ST.avail ? 'Available to donate' : 'Not available'}</div><div><small>Total donations</small>${n}</div><div><small>Last donation</small>${esc(e.last)}</div><div class="w"><small>Address</small>${esc(me.addr)}</div><div class="w"><small>Eligibility</small>${e.ok ? 'Fit to donate now' : 'Eligible again on ' + e.next}</div></div></div>`;
    m.classList.add('on'); m.setAttribute('aria-hidden', 'false');
  }
  const closeProf = () => { const m = $('#modal'); m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); };

  /* ---------- events ---------- */
  $('#nav').innerHTML = NAV.map(([k, t, p]) => `<button type="button" data-v="${k}">${ic(p)}<span>${t}</span></button>`).join('');
  $('#logout').innerHTML = ic('<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>') + '<span>Log out</span>';
  $('#av').textContent = (me.first[0] || 'D').toUpperCase();
  document.body.classList.toggle('calm', !!ST.calm);
  const theme = () => { document.documentElement.classList.toggle('light', !!ST.light); const m = $('meta[name=theme-color]'); if (m) m.content = ST.light ? '#fff8f8' : '#0b0508'; };
  theme();

  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === 'prof') { side(false); profile(); return; }
    if (b.dataset.v === 'msgs') act = null;
    go(b.dataset.v);
  });
  $('#logout').onclick = () => {
    try { localStorage.removeItem('lifedrop-user'); } catch (e) {}
    document.body.classList.add('out'); setTimeout(() => { location.href = 'index.html'; }, 500);
  };
  $('#burger').onclick = () => side(true);
  $('#scrim').onclick = () => side(false);
  $('#av').onclick = profile;
  $('#modal').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('[data-x]')) closeProf(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeProf(); side(false); } });

  const setAvail = v => { ST.avail = v; W('ld_set', ST); const k = $('[data-k=avail]'); if (k) k.checked = v; toast(v ? 'You are now visible to nearby requests' : 'You are hidden from new requests'); };

  $('#view').addEventListener('click', e => {
    const t = e.target, q = s => t.closest(s);
    let x;
    if ((x = q('[data-chat]'))) return openChat(x.dataset.chat);
    if ((x = q('[data-go]'))) return go(x.dataset.go);
    if ((x = q('[data-s]'))) { ST.sort = x.dataset.s; W('ld_set', ST); $$('[data-s]').forEach(b => b.classList.toggle('on', b === x)); $('#fl').innerHTML = posts(); return; }
    if ((x = q('[data-m]'))) return setMonth(+x.dataset.m);
    if ((x = q('[data-h]'))) return pick(+x.dataset.h);
    if ((x = q('[data-c]'))) { act = x.dataset.c; return paintChat(true); }
    if (q('[data-bk]')) { act = null; return paintChat(); }
  });
  $('#view').addEventListener('change', e => {
    if (e.target.id === 'mo') return setMonth(+e.target.value);
    const k = e.target.dataset.k; if (!k) return;
    if (k === 'avail') return setAvail(e.target.checked);
    if (k === 'dark') ST.light = !e.target.checked; else ST[k] = e.target.checked;
    W('ld_set', ST);
    if (k === 'calm') document.body.classList.toggle('calm', ST.calm);
    if (k === 'dark') theme();
    toast('Setting saved');
  });
  $('#view').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('#ci');
    if (!i || !e.target.contains(i)) return; /* not the chat form (e.g. account settings) */
    const x = i.value.trim(), id = act;
    if (!x || !id) return;
    CV[id].m.push({ me: 1, x }); save(); paintChat(true);
    setTimeout(() => { if (act === id && cur === 'msgs' && $('#ms')) { $('#ms').insertAdjacentHTML('beforeend', '<div class="m ty" id="ty"><i></i><i></i><i></i></div>'); $('#ms').scrollTop = 1e9; } }, 500);
    setTimeout(() => { CV[id].m.push({ x: REPLY[Math.random() * REPLY.length | 0] }); save(); if (act === id && cur === 'msgs') paintChat(); }, 1900);
  });
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card');
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }
  });

  const h0 = location.hash.slice(1);
  go(V[h0] ? h0 : 'dash');
})();
