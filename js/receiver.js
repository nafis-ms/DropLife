(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const J = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- access guard: receivers only ---------- */
  const P = J('lifedrop_profile'), U = J('lifedrop-user');
  if (!P || P.role !== 'receiver' || !U) { location.replace('index.html'); return; }

  const mkMe = (P, U) => {
    const D = P.details || {};
    return {
      first: P.firstName || (U.name || '').split(' ')[0] || 'there',
      name: ((P.firstName || '') + ' ' + (P.lastName || '')).trim() || U.name || 'Receiver',
      email: P.email || U.email || '',
      phone: D.suRPhone || 'Not added',
      country: D.suRCountry || 'Not added',
      address: D.suRAddress || '',
      group: D.needGroup || '',
      since: P.since || new Date().getFullYear()
    };
  };
  const me = mkMe(P, U);
  /* Storage is per account, so two people on one device never see each other's requests. */
  const K = k => 'ldr_' + k + '_' + (me.email || 'guest').toLowerCase();

  /* ---------- constants and demo data (replace with your backend) ---------- */
  const H = 36e5, DAY = 864e5;
  const G = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const CAN = { 'O-': G, 'O+': ['O+', 'A+', 'B+', 'AB+'], 'A-': ['A-', 'A+', 'AB-', 'AB+'], 'A+': ['A+', 'AB+'], 'B-': ['B-', 'B+', 'AB-', 'AB+'], 'B+': ['B+', 'AB+'], 'AB-': ['AB-', 'AB+'], 'AB+': ['AB+'] };
  const CL = ['#ff4d5e', '#ff8a5c', '#ffc15c', '#e5e66b', '#6be6a4', '#5cc8ff', '#8b7bff', '#e56bd6'];
  const RECV = t => G.filter(g => CAN[g].includes(t));
  const REASONS = ['Surgery', 'Accident or trauma', 'Delivery or C-section', 'Thalassemia or anaemia', 'Cancer treatment', 'Dengue or infection', 'Other'];

  const ME = { lat: 23.7461, lng: 90.3742 }; /* demo location: Dhanmondi, Dhaka. Replace with the receiver's saved location */
  const kmTo = (a, b) => { const r = x => x * Math.PI / 180, d = r(b.lat - a.lat), e = r(b.lng - a.lng), h = Math.sin(d / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(e / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

  /* Nearby donors: [name, group, lat offset, lng offset, available] */
  const DN = [['Rafiq H.', 'O+', .006, .011, 1], ['Nadia S.', 'A+', -.012, .004, 1], ['Sabbir A.', 'B+', .018, -.009, 1], ['Tahmina K.', 'O-', -.004, -.016, 1],
    ['Mahin R.', 'AB+', .025, .02, 0], ['Shuvo D.', 'B-', -.021, .013, 1], ['Lamia I.', 'A-', .009, .028, 1], ['Fahim M.', 'O+', -.03, -.006, 1],
    ['Anika T.', 'B+', .014, .006, 1], ['Jubayer C.', 'A+', .034, -.021, 0], ['Priya N.', 'AB-', -.017, -.027, 1], ['Hasan Z.', 'O+', .002, -.004, 1],
    ['Sumaiya B.', 'B+', -.009, .022, 1], ['Kamal U.', 'A+', .041, .012, 1], ['Ripon G.', 'O-', -.026, .031, 1], ['Tania F.', 'AB+', .021, -.033, 1]]
    .map(([n, g, a, b, ok], i) => { const o = { id: 'd' + i, n, g, lat: ME.lat + a, lng: ME.lng + b, ok: !!ok }; o.km = +kmTo(ME, o).toFixed(1); return o; })
    .sort((x, y) => x.km - y.km);

  /* Hospitals with blood bank stock in units, in the order of G */
  const HS = [['Labaid Specialized Hospital', 23.7392, 90.3818, [34, 6, 28, 5, 12, 3, 41, 8]], ['Square Hospitals', 23.7525, 90.3813, [42, 9, 31, 7, 15, 4, 47, 12]],
    ['Dhaka Medical College Hospital', 23.7259, 90.3977, [21, 3, 18, 2, 9, 1, 26, 4]], ['Bangladesh Specialized Hospital', 23.7746, 90.3647, [27, 5, 22, 6, 10, 3, 33, 7]],
    ['United Hospital', 23.8043, 90.4156, [38, 8, 30, 6, 14, 5, 44, 10]], ['Evercare Hospital', 23.8103, 90.4318, [45, 11, 36, 9, 17, 6, 52, 14]]]
    .map(([n, lat, lng, s]) => ({ n, lat, lng, s, km: +kmTo(ME, { lat, lng }).toFixed(1) })).sort((a, b) => a.km - b.km);

  const DIST = [312, 58, 246, 41, 98, 22, 421, 86]; /* donors available on the server, by group */
  const AVAIL = DIST.reduce((a, v) => a + v, 0), REG = 3412, ALL = 18204;
  const now0 = new Date();
  const mons = [...Array(6)].map((_, i) => new Date(now0.getFullYear(), now0.getMonth() - 5 + i, 1));
  const MO = mons.map(d => d.toLocaleString('en-GB', { month: 'short' }));
  const MF = mons.map(d => d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }));
  const DATA = [[212, 34, 166, 27, 66, 12, 289, 52], [231, 38, 172, 30, 71, 13, 301, 57], [205, 31, 158, 26, 62, 11, 274, 49],
    [248, 41, 187, 33, 77, 15, 322, 61], [263, 44, 195, 35, 81, 16, 339, 66], [281, 47, 208, 38, 87, 18, 358, 71]];

  /* ---------- state ---------- */
  const ST = Object.assign({ alerts: true, donors: true, calm: matchMedia('(prefers-reduced-motion: reduce)').matches, light: true }, J('ldr_set') || {});
  const saveS = () => W('ldr_set', ST);
  const iso = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dl = r => new Date(r.date + 'T23:59:59').getTime(); /* a request closes at the end of its date */

  const seed = () => {
    if (P.provider !== 'demo') return [[], []];
    const t = Date.now(), day = n => iso(t + n * DAY);
    return [[
      { id: 'r1', made: t - 5 * H, patient: 'Mahbub Alam', hospital: 'Square Hospitals', loc: '18/F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath, Dhaka', date: day(1), group: 'B+', reason: 'Surgery', note: 'Bypass surgery is scheduled. Two bags needed.' },
      { id: 'r2', made: t - 26 * H, patient: 'Sultana Begum', hospital: 'Dhaka Medical College Hospital', loc: 'Secretariat Road, Dhaka 1000', date: day(4), group: 'B+', reason: 'Thalassemia or anaemia', note: '' }
    ], [
      { id: 'h1', made: Date.parse('2026-09-28'), patient: 'Karim Uddin', hospital: 'United Hospital', loc: 'Plot 15, Road 71, Gulshan, Dhaka', date: '2026-10-02', group: 'B+', reason: 'Accident or trauma', note: '', status: 'fulfilled' },
      { id: 'h2', made: Date.parse('2026-09-10'), patient: 'Rehana Parvin', hospital: 'Evercare Hospital', loc: 'Plot 81, Block E, Bashundhara R/A, Dhaka', date: '2026-09-14', group: 'O+', reason: 'Delivery or C-section', note: '', status: 'fulfilled' },
      { id: 'h3', made: Date.parse('2026-08-22'), patient: 'Abdul Malek', hospital: 'Labaid Specialized Hospital', loc: 'House 6, Road 4, Dhanmondi, Dhaka', date: '2026-08-27', group: 'B+', reason: 'Surgery', note: '', status: 'expired' },
      { id: 'h4', made: Date.parse('2026-07-03'), patient: 'Shirin Akter', hospital: 'Square Hospitals', loc: 'Panthapath, Dhaka', date: '2026-07-09', group: 'A+', reason: 'Dengue or infection', note: '', status: 'fulfilled' }
    ]];
  };
  let REQ = J(K('reqs')), HIST = J(K('hist'));
  const saveR = () => { W(K('reqs'), REQ); W(K('hist'), HIST); };
  if (!Array.isArray(REQ) || !Array.isArray(HIST)) { [REQ, HIST] = seed(); saveR(); }

  /* A request past its date leaves the live list and is archived in History. */
  const sweep = () => {
    const t = Date.now(), gone = REQ.filter(r => dl(r) < t);
    if (!gone.length) return false;
    REQ = REQ.filter(r => dl(r) >= t);
    gone.forEach(r => HIST.unshift({ ...r, status: 'expired' }));
    saveR();
    return true;
  };
  sweep();

  let CV = J(K('msgs')) || (P.provider === 'demo' ? { d0: { n: 'Rafiq H.', g: 'O+', m: [{ x: 'Hi, I saw your request at Square Hospitals. I am O+ and free tomorrow morning.' }, { me: 1, x: 'Thank you so much. Please come to the blood bank counter on the 3rd floor.' }] } } : {});
  const saveC = () => W(K('msgs'), CV);
  const REPLY = ['I can be there in about an hour.', 'Which gate should I come to?', 'Happy to help. Please share the ward number.', 'On my way after work. Is that still fine?'];

  let cur = 'dash', first = true, act = null, FG = 'All', SH = 0, SEL = MO.length - 1;
  let MAP = null, DL = null, HM = [], DMK = {}, lastFocus = null, pend = null;

  /* ---------- helpers ---------- */
  const fd = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const left = ms => { const m = Math.max(0, Math.floor(ms / 6e4)); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h < 24 ? h + ' h ' + (m % 60) + ' min' : Math.floor(h / 24) + ' d ' + (h % 24) + ' h'; };
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const num = n => Number(n).toLocaleString('en-US');
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2800); };
  const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const lv = u => u < 10 ? ['low', 'Low', '#ff4d5e'] : u < 25 ? ['mid', 'Fair', '#e0a21a'] : ['ok', 'Good', '#2fbf7a'];
  const gcol = g => CL[G.indexOf(g)];

  const IC = {
    dash: '<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/>',
    neu: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M12 11v5M9.5 13.5h5"/>',
    mine: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>',
    msgs: '<path d="M4 5h16v11H9l-5 4z"/>',
    hist: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"/>',
    prof: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    out: '<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  const NAV = [['dash', 'Dashboard'], ['neu', 'New request'], ['mine', 'My requests'], ['msgs', 'Messages'], ['hist', 'History'], ['prof', 'Profile'], ['set', 'Settings']];
  const TT = { dash: 'Dashboard', neu: 'New blood request', mine: 'My requests', msgs: 'Messages', hist: 'Request history', set: 'Settings' };

  /* ---------- dashboard ---------- */
  const tot = j => DATA[j].reduce((a, v) => a + v, 0);
  const delta = j => { if (!j) return 'First month shown'; const d = tot(j) - tot(j - 1); return `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '&#9650;' : '&#9660;'} ${Math.abs(Math.round(d / tot(j - 1) * 100))}%</span> vs ${MO[j - 1]}`; };
  const tween = (el, a, b) => { el.dataset.n = b; const t0 = performance.now(), f = t => { const k = Math.min((t - t0) / 700, 1); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; ST.calm ? (el.textContent = b) : requestAnimationFrame(f); };

  function chartHTML() {
    const j = SEL, t = tot(j), mx = Math.max(...DATA[j]), mt = Math.max(...DATA.map((_, k) => tot(k)));
    return `<section class="card c12 chart" style="--i:6"><div class="ch-h"><h3>Blood donated through LifeDrop, by blood group</h3><label class="sel"><span>Month</span><select id="mo" aria-label="Select month">${MF.map((m, k) => `<option value="${k}" ${k === j ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
<div class="ch-b"><div class="ch-t"><small>Total donated, in units</small><div class="num" id="mt" data-n="${t}">0</div><p class="dl" id="md">${delta(j)}</p><div class="mini">${DATA.map((_, k) => `<button type="button" data-m="${k}" class="${k === j ? 'on' : ''}" aria-label="${MF[k]}"><i style="--h:${tot(k) / mt}"></i><span>${MO[k]}</span></button>`).join('')}</div></div>
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

  const vis = () => DN.filter(d => FG === 'All' || d.g === FG);
  const drow = d => `<div class="row dr${d.ok ? '' : ' off'}" data-fd="${d.id}"><span class="gb s">${d.g}</span><span class="rtx"><b>${esc(d.n)}</b><small>${d.km} km away</small><small>${d.ok ? '<i class="ldot"></i>Available' : 'Available soon'}</small></span><button type="button" class="btn sm" data-dm="${d.id}" ${d.ok ? '' : 'disabled'} aria-label="Message ${esc(d.n)}">Message</button></div>`;
  const dlist = () => { const v = vis(); return v.length ? v.slice(0, 10).map(drow).join('') : `<p class="em">No ${FG} donors nearby yet.</p>`; };
  const dcount = () => { const v = vis(); return v.length ? `${v.length} ${FG === 'All' ? '' : FG + ' '}donor${v.length === 1 ? '' : 's'} within ${Math.ceil(Math.max(...v.map(d => d.km)))} km` : 'No matches'; };

  const compat = t => {
    const cs = RECV(t), cnt = g => DN.filter(d => d.ok && d.g === g).length, n = cs.reduce((a, g) => a + cnt(g), 0);
    return `<p class="cpn"><b>${n}</b> available donor${n === 1 ? '' : 's'} nearby can give to ${t}</p><div class="cpg">${cs.map(g => `<button type="button" data-f="${g}" class="${cnt(g) ? '' : 'z'}" style="--c:${gcol(g)}"><i></i>${g}<em>${cnt(g)}</em></button>`).join('')}</div><small>Tap a group to show those donors on the map.</small>${stockFor(t)}`;
  };

  const stockFor = t => {
    const k = G.indexOf(t);
    return `<div class="sfw"><b>${t} in stock nearby</b><div class="sf">${HS.map((h, i) => ({ h, i, u: h.s[k] })).sort((a, b) => b.u - a.u).slice(0, 4).map(({ h, i, u }) => { const [c, l] = lv(u); return `<button type="button" data-h="${i}" class="sfr${i === SH ? ' on' : ''}"><span>${esc(h.n)}</span><b>${u}</b><em class="lv ${c}">${l}</em></button>`; }).join('')}</div></div>`;
  };
  const rowsHTML = () => G.map((g, i) => `<div class="sr ${g === me.group ? 'mine' : ''}"><span class="cg"><i style="background:${CL[i]};box-shadow:0 0 8px ${CL[i]}"></i>${g}${g === me.group ? ' <em class="you">You</em>' : ''}</span><div class="tk"><div class="fl"></div></div><b>0</b><em class="lv"></em></div>`).join('');

  function paintStock(i, init) {
    const h = HS[i], rows = $$('.sr');
    $('#sn').textContent = h.n;
    $('#sm').innerHTML = `${h.km} km away · about ${Math.round(h.km * 3.5)} min by car <a class="dir" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}">Directions</a>`;
    rows.forEach((r, k) => {
      const u = h.s[k], [c, t, col] = lv(u), b = $('b', r), l = $('.lv', r);
      r.style.setProperty('--c', col);
      $('.fl', r).style.setProperty('--w', Math.min(100, u / 60 * 100) + '%');
      init ? (b.textContent = u) : tween(b, +b.textContent, u);
      l.textContent = t; l.className = 'lv ' + c;
    });
    $('#stt').textContent = `${h.s.reduce((a, v) => a + v, 0)} units in stock across all groups`;
  }
  function pickH(i) {
    SH = i;
    $$('[data-h]').forEach(e => e.classList.toggle('on', +e.dataset.h === i));
    paintStock(i);
    if (MAP) {
      HM.forEach((m, j) => { const el = m.getElement(); if (el && el.firstChild) el.firstChild.classList.toggle('on', j === i); });
      MAP.flyTo([HS[i].lat, HS[i].lng], 14, { animate: !ST.calm, duration: 1.1 });
    }
  }

  function dash() {
    const a = [...REQ].sort((x, y) => dl(x) - dl(y)), mt = DATA.map((_, k) => tot(k)), mn = Math.min(...mt), mx = Math.max(...mt);
    const pts = mt.map((v, k) => [2 + k * 23.2, 30 - (v - mn) / ((mx - mn) || 1) * 24]), lp = pts[pts.length - 1];
    const gr = Math.round((mt[5] - mt[4]) / mt[4] * 100);
    const top = DIST.map((v, i) => [G[i], v]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([g, v]) => `${g} ${num(v)}`).join(', ');
    const t0 = me.group || 'B+';
    return `<section class="hero"><div><p class="eb">${greet()}</p><h2>${esc(me.first)}, donors are <em>close by.</em></h2></div><button type="button" class="btn" data-go="neu">Request blood</button></section>
<div class="grid">
<section class="card c4" style="--i:1"><h3>Donors available now</h3><div class="num" data-n="${AVAIL}">0</div><p><span class="live"></span>of ${num(REG)} registered on LifeDrop</p><div class="dist" role="img" aria-label="Available donors by blood group">${DIST.map((v, i) => `<i style="--f:${v};--c:${CL[i]};--k:${i}" title="${G[i]}: ${v}"></i>`).join('')}</div><small>Most available: ${top}</small></section>
<section class="card c4" style="--i:2"><h3>Donations completed</h3><div class="num" data-n="${ALL}">0</div><svg class="spark" viewBox="0 0 120 36" role="img" aria-label="Donations over the last six months"><path pathLength="1" d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')}"/><circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="3"/></svg><small>${gr >= 0 ? '<span class="up">&#9650;</span>' : '<span class="dn">&#9660;</span>'} ${Math.abs(gr)}% vs last month · up to ${num(ALL * 3)} lives helped</small></section>
<section class="card c4" style="--i:3"><h3>Your active requests</h3>${a.length ? a.slice(0, 3).map(r => `<button type="button" class="row" data-go="mine"><span class="gb s">${r.group}</span><span class="rtx"><b>${esc(r.patient)}</b><small>${esc(r.hospital)}</small></span><span class="tm" data-dl="${dl(r)}">${left(dl(r) - Date.now())}</span></button>`).join('') + `<button type="button" class="btn g" data-go="mine" style="width:100%;margin-top:4px">View all requests</button>` : `<p class="em" style="padding:14px 0">Nothing posted yet. Post a request and nearby donors will be alerted.</p><button type="button" class="btn" data-go="neu" style="width:100%">New request</button>`}</section>
<section class="card c8 map" id="mapc" style="--i:4"><div class="mh"><h3>Live map</h3><div class="fchips" id="fc" role="group" aria-label="Filter donors by blood group">${['All', ...G].map(g => `<button type="button" data-f="${g}" class="${g === FG ? 'on' : ''}" aria-pressed="${g === FG}">${g}</button>`).join('')}</div></div><div class="lmap big" id="lmap"></div><div class="lg"><span><i class="k you"></i>You</span><span><i class="k hos"></i>Hospital</span><span><i class="k don"></i>Donor, coloured by blood group</span></div><small class="mcap">Demo area: Dhanmondi, Dhaka.</small></section>
<section class="card c4 dcard" style="--i:5"><h3>Nearest donors</h3><small id="dn">${dcount()}</small><div class="dlist" id="dl">${dlist()}</div></section>
<section class="card c7" style="--i:6"><h3>Nearby hospitals and blood bank stock</h3><div class="hs"><div class="hn" role="group" aria-label="Hospitals">${HS.map((h, i) => `<button type="button" data-h="${i}" class="${i === SH ? 'on' : ''}"><b>${esc(h.n)}</b><small>${h.km} km away</small></button>`).join('')}</div><div class="sp"><h4 id="sn"></h4><p class="sinfo" id="sm"></p><div class="srs">${rowsHTML()}</div><small id="stt"></small></div></div></section>
<section class="card c5" style="--i:7"><h3>Who can donate to your patient</h3><small>Blood group needed</small><div class="fchips" id="cps" role="group" aria-label="Blood group needed" style="margin-top:8px">${G.map(g => `<button type="button" data-t="${g}" class="${g === t0 ? 'on' : ''}" aria-pressed="${g === t0}">${g}</button>`).join('')}</div><div id="cp">${compat(t0)}</div></section>
${chartHTML().replace('--i:6', '--i:8')}
</div>`;
  }

  /* ---------- map ---------- */
  const popup = d => `<div class="pp"><b>${esc(d.n)}</b>${d.g} · ${d.km} km away${d.ok ? `<br><button type="button" class="btn sm" data-dm="${d.id}">Message</button>` : '<br><small>Available soon</small>'}</div>`;
  function drawDonors(fit) {
    if (!MAP) return;
    DL.clearLayers();
    const v = vis();
    if (ST.donors) v.forEach(d => DL.addLayer(DMK[d.id]));
    const pts = [[ME.lat, ME.lng], ...v.slice(0, 5).map(d => [d.lat, d.lng]), ...HS.slice(0, 2).map(h => [h.lat, h.lng])];
    MAP.fitBounds(pts, { padding: [34, 34], animate: !fit && !ST.calm });
  }
  function initMap() {
    const el = $('#lmap'); if (!el) return;
    if (!window.L) { el.innerHTML = '<p class="em" style="padding-top:120px">The map could not load. Check your connection.</p>'; return; }
    MAP = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${ST.light ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`, { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(MAP);
    L.marker([ME.lat, ME.lng], { icon: L.divIcon({ className: '', html: '<div class="rd"><i></i></div>', iconSize: [320, 320] }), interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(MAP);
    L.marker([ME.lat, ME.lng], { icon: L.divIcon({ className: '', html: '<div class="ud"></div>', iconSize: [16, 16] }), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(MAP);
    HM = HS.map((h, i) => L.marker([h.lat, h.lng], { title: h.n, icon: L.divIcon({ className: '', html: `<div class="mk${i === SH ? ' on' : ''}"></div>`, iconSize: [24, 24] }) }).on('click', () => pickH(i)).addTo(MAP));
    DL = L.layerGroup().addTo(MAP);
    DN.forEach((d, k) => { DMK[d.id] = L.marker([d.lat, d.lng], { title: d.n + ' · ' + d.g, icon: L.divIcon({ className: '', html: `<div class="dm${d.ok ? '' : ' off'}" style="--c:${gcol(d.g)};--k:${k}">${d.g}</div>`, iconSize: [30, 30] }) }).bindPopup(popup(d)); });
    /* Leaflet stops click events inside popups, so the Message button is wired here. */
    MAP.on('popupopen', e => { const b = e.popup.getElement().querySelector('[data-dm]'); if (b) b.onclick = () => openChat(b.dataset.dm); });
    drawDonors(true);
    setTimeout(() => MAP && MAP.invalidateSize(), 1700);
  }
  function setFilter(g) {
    FG = g;
    $$('#fc button').forEach(b => { const on = b.dataset.f === g; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('#dl').innerHTML = dlist(); $('#dn').textContent = dcount();
    drawDonors(false);
  }
  function focusDonor(id) {
    const d = DN.find(x => x.id === id); if (!d || !MAP) return;
    $('#mapc').scrollIntoView({ behavior: ST.calm ? 'auto' : 'smooth', block: 'center' });
    MAP.setView([d.lat, d.lng], 15, { animate: !ST.calm });
    if (DMK[id] && DL.hasLayer(DMK[id])) DMK[id].openPopup();
  }

  /* ---------- forms ---------- */
  const form = (r = {}) => `<form class="rform" id="rf" novalidate ${r.id ? `data-edit="${r.id}"` : ''}>
<div class="fld"><label for="f-p">Patient name</label><input id="f-p" name="patient" autocomplete="off" value="${esc(r.patient)}"><small class="fe"></small></div>
<div class="f2"><div class="fld"><label for="f-h">Hospital name</label><input id="f-h" name="hospital" autocomplete="off" value="${esc(r.hospital)}"><small class="fe"></small></div>
<div class="fld"><label for="f-l">Hospital location</label><input id="f-l" name="loc" autocomplete="off" placeholder="Area, ward or floor" value="${esc(r.loc)}"><small class="fe"></small></div></div>
<div class="f2"><div class="fld"><label for="f-d">Date of donation</label><input id="f-d" name="date" type="date" min="${iso(Date.now())}" value="${esc(r.date)}"><small class="fe"></small></div>
<div class="fld"><label for="f-r">Reason</label><select id="f-r" name="reason"><option value="" disabled ${r.reason ? '' : 'selected'}>Select a reason</option>${REASONS.map(x => `<option ${r.reason === x ? 'selected' : ''}>${x}</option>`).join('')}</select><small class="fe"></small></div></div>
<fieldset class="fld" data-k="group"><legend>Blood type needed</legend><div class="bg8">${G.map(g => `<label><input type="radio" name="group" value="${g}" ${r.group === g ? 'checked' : ''}><span>${g}</span></label>`).join('')}</div><small class="fe"></small></fieldset>
<div class="fld"><label for="f-q">Query <span style="font-weight:400">(optional)</span></label><textarea id="f-q" name="note" rows="3" placeholder="Anything donors should know, like ward number or a contact person">${esc(r.note)}</textarea></div>
<button type="submit" class="btn">${r.id ? 'Save changes' : 'Post request'}</button></form>`;

  function readForm(f, strict) {
    const el = f.elements;
    const v = { patient: el.patient.value.trim(), hospital: el.hospital.value.trim(), loc: el.loc.value.trim(), date: el.date.value, reason: el.reason.value, note: el.note.value.trim(), group: ($('[name=group]:checked', f) || {}).value || '' };
    if (!strict) return v;
    const E = { patient: 'Enter the patient’s name.', hospital: 'Enter the hospital name.', loc: 'Enter the hospital location.', date: !v.date ? 'Pick the date of donation.' : v.date < iso(Date.now()) ? 'Pick today or a later date.' : '', reason: 'Select a reason.', group: 'Select a blood type.' };
    let bad = null;
    ['patient', 'hospital', 'loc', 'date', 'reason', 'group'].forEach(k => {
      const msg = k === 'date' ? E.date : (v[k] ? '' : E[k]);
      const box = k === 'group' ? $('[data-k=group]', f) : el[k].closest('.fld');
      box.classList.toggle('bad', !!msg); $('.fe', box).textContent = msg;
      if (msg && !bad) bad = k === 'group' ? $('[name=group]', f) : el[k];
    });
    if (bad) { bad.focus(); return null; }
    return v;
  }
  const pvHTML = v => `<div class="pvr"><span class="gb s">${v.group || '?'}</span><div><b>${esc(v.patient || 'Patient name')}</b> <small>needs blood · posted just now</small><p>${esc(v.reason || 'Reason for donation')}${v.note ? '. ' + esc(v.note) : ''}</p><div class="tags"><span class="tag hot">${v.date ? 'Needed on ' + fd(v.date) : 'Pick a date'}</span><span class="tag">${esc(v.hospital || 'Hospital')}</span>${v.loc ? `<span class="tag">${esc(v.loc)}</span>` : ''}</div></div></div>`;

  const neu = () => `<div class="grid"><section class="card c7" style="--i:0"><h3>Tell donors what you need</h3>${form()}</section>
<div class="c5 col"><section class="card pvc" style="--i:1"><h3>How donors will see it</h3><div id="pv">${pvHTML({})}</div></section>
<section class="card" style="--i:2"><h3>For a faster response</h3><ul class="tips"><li>Add the ward or floor to the hospital location.</li><li>Post a day ahead when you can.</li><li>Keep your phone nearby. Donors may message you.</li></ul></section></div></div>`;

  /* ---------- my requests ---------- */
  const rq = (r, i) => { const ms = dl(r) - Date.now(), dot = /[.!?]$/.test(r.reason) ? '' : '.'; return `<article class="card rq" style="--i:${i + 1}"><span class="gb s">${r.group}</span><div><h4>${esc(r.patient)}</h4><small>Posted ${ago(r.made)} · ${esc(r.hospital)}, ${esc(r.loc)}</small><p>${esc(r.reason)}${dot}${r.note ? ' ' + esc(r.note) : ''}</p><div class="tags"><span class="tag">${fd(r.date)}</span><span class="tag ${ms < DAY ? 'hot' : ''}">Closes in <span data-dl="${dl(r)}">${left(ms)}</span></span></div></div><div class="acts"><button type="button" class="btn sm" data-ed="${r.id}">Edit</button><button type="button" class="btn sm g" data-fu="${r.id}">Mark fulfilled</button><button type="button" class="btn sm g d" data-del="${r.id}">Delete</button></div></article>`; };
  const mine = () => {
    const a = [...REQ].sort((x, y) => dl(x) - dl(y));
    if (!a.length) return `<div class="card emp" style="--i:0"><h3>No active requests</h3><p>Post a request and matching donors nearby will be alerted.</p><button type="button" class="btn" data-go="neu">New request</button></div>`;
    return `<p class="lead">${a.length} active request${a.length === 1 ? '' : 's'}. Each moves to History once its date has passed.</p>` + a.map(rq).join('');
  };

  /* ---------- messages ---------- */
  const lastMsg = id => { const m = CV[id].m.slice(-1)[0]; return m ? (m.me ? 'You: ' : '') + m.x : 'Say hello'; };
  const clist = () => Object.keys(CV).map(id => `<button type="button" data-c="${id}" class="${id == act ? 'on' : ''}"><span class="gb s">${CV[id].g}</span><span class="rtx"><b>${esc(CV[id].n)}</b><small>${esc(lastMsg(id))}</small></span></button>`).join('') || '<p class="em">No conversations yet.</p>';
  const thread = () => { const c = CV[act]; return `<div class="thh"><button type="button" class="bk" data-bk aria-label="Back to conversations">&larr;</button><b>${esc(c.n)}</b><small>${c.g} donor</small></div><div class="ms" id="ms">${c.m.map(m => `<div class="m ${m.me ? 'me' : ''}">${esc(m.x)}</div>`).join('')}</div><form class="cf" id="cf"><input id="ci" placeholder="Write a message…" autocomplete="off" aria-label="Message"><button class="btn">Send</button></form>`; };
  const EMPTY = '<p class="em" style="margin:auto">Select a conversation, or message a donor from the dashboard.</p>';
  function msgs() {
    if (!act && innerWidth > 900) act = Object.keys(CV)[0] || null;
    return `<div class="card chat ${act ? 'open' : ''}" style="--i:0"><div class="cl">${clist()}</div><div class="th">${act ? thread() : EMPTY}</div></div>`;
  }
  function paintChat(focus) {
    const c = $('.chat'); if (!c) return;
    c.classList.toggle('open', !!act);
    $('.cl', c).innerHTML = clist(); $('.th', c).innerHTML = act ? thread() : EMPTY;
    document.body.classList.toggle('inchat', cur === 'msgs' && !!act && innerWidth <= 900);
    const ms = $('#ms'); if (ms) ms.scrollTop = 1e9;
    if (focus && $('#ci')) $('#ci').focus({ preventScroll: true });
  }
  function openChat(id) {
    const d = DN.find(x => x.id === id); if (!d) return;
    CV[id] = CV[id] || { n: d.n, g: d.g, m: [] };
    act = id; saveC(); go('msgs');
  }

  /* ---------- history ---------- */
  function hist() {
    const total = REQ.length + HIST.length, ful = HIST.filter(h => h.status === 'fulfilled').length;
    const st = [['Requests posted', total], ['Fulfilled', ful], ['Expired', HIST.length - ful]].map(([t, v], i) => `<section class="card c4" style="--i:${i}"><h3>${t}</h3><div class="num" data-n="${v}">0</div></section>`).join('');
    const h = [...HIST].sort((a, b) => dl(b) - dl(a));
    return `<p class="lead">Requests are archived here after their date passes, and they leave the live list for donors.</p><div class="grid">${st}</div>` + (h.length ? `<div class="tl" style="margin-top:24px">${h.map((r, i) => `<div class="card ev" style="--i:${i + 3}"><span class="gb s">${r.group}</span><div><b>${esc(r.patient)}</b><small>${esc(r.hospital)} · ${fd(r.date)} · ${esc(r.reason)}</small></div><span class="tag ${r.status === 'fulfilled' ? 'ok' : ''}">${r.status === 'fulfilled' ? 'Fulfilled' : 'Expired'}</span></div>`).join('')}</div>` : '<div class="card em" style="margin-top:18px">No past requests yet. Closed requests will appear here.</div>');
  }

  /* ---------- settings ---------- */
  const TG = [['donors', 'Show donors on the map', 'Turn off to see only hospitals and your location.'], ['alerts', 'Donor reply alerts', 'Show a notice when a donor replies to you.'],
    ['dark', 'Dark mode', 'Switch to the dark cinematic look.'], ['calm', 'Reduce motion', 'Tone down animations and effects.']];
  const set = () => `<div id="acct"></div><section class="card" style="--i:2;max-width:720px">${TG.map(([k, t, d]) => `<label class="set sw"><div><b style="color:var(--t)">${t}</b><small>${d}</small></div><input type="checkbox" data-k="${k}" ${(k === 'dark' ? !ST.light : ST[k]) ? 'checked' : ''}><i></i></label>`).join('')}</section>`;

  const V = { dash, neu, mine, msgs, hist, set };

  /* ---------- engine ---------- */
  const count = (root, delay) => $$('[data-n]', root).forEach(el => {
    const to = +el.dataset.n;
    if (ST.calm) { el.textContent = num(to); return; }
    let t0;
    const f = t => { t0 = t0 || t; const k = Math.min((t - t0) / 1200, 1); el.textContent = num(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f); };
    setTimeout(() => requestAnimationFrame(f), delay);
  });
  const side = on => { $('#side').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); };

  function go(v) {
    cur = v;
    if (MAP) { MAP.remove(); MAP = null; } HM = []; DMK = {}; DL = null;
    $$('#nav button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#ttl').textContent = TT[v];
    document.body.classList.remove('inchat');
    const el = $('#view');
    el.classList.remove('in');
    el.style.setProperty('--b', first ? '1.5s' : '0s');
    el.innerHTML = V[v]();
    if (v === 'set') LifeDropAccount.mount($('#acct'), { role: 'receiver', toast, onSaved: (p, u) => { Object.assign(me, mkMe(p, u)); $('#av').textContent = (me.first[0] || 'R').toUpperCase(); } });
    count(el, first ? 1500 : 150);
    if (v === 'dash') { initMap(); paintStock(SH, true); }
    first = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    history.replaceState(null, '', '#' + v);
    scrollTo(0, 0); side(false);
    if (v === 'msgs') paintChat();
  }

  /* ---------- modal ---------- */
  function openMod(html, label) {
    const m = $('#modal'); lastFocus = document.activeElement;
    m.innerHTML = html; m.firstElementChild.setAttribute('aria-label', label);
    m.classList.add('on'); m.setAttribute('aria-hidden', 'false');
    setTimeout(() => { const f = $('.x', m) || $('input,select,button', m); if (f) f.focus({ preventScroll: true }); }, 350);
  }
  function closeMod() {
    const m = $('#modal'); if (!m.classList.contains('on')) return;
    m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); pend = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function profile() {
    const ful = HIST.filter(h => h.status === 'fulfilled').length;
    openMod(`<div class="card pc" role="dialog" aria-modal="true"><button type="button" class="x" data-x aria-label="Close">&times;</button><div class="pt"><span class="gb">${esc((me.first[0] || 'R').toUpperCase())}</span><div><h2>${esc(me.name)}</h2><small>Receiver · member since ${esc(me.since)}</small></div></div><div class="kv"><div><small>Email</small>${esc(me.email)}</div><div><small>Phone</small>${esc(me.phone)}</div><div><small>Country</small>${esc(me.country)}</div><div><small>Address</small>${esc(me.address || 'Not added')}</div><div><small>Blood group needed</small>${esc(me.group || 'Not set')}</div><div><small>Active requests</small>${REQ.length}</div><div><small>Total requests</small>${REQ.length + HIST.length}</div><div><small>Fulfilled</small>${ful}</div><div><small>Account type</small>${P.provider === 'demo' ? 'Demo account' : 'Receiver'}</div><div class="w"><small>Map location</small>Dhanmondi, Dhaka (demo area)</div></div></div>`, 'Receiver profile');
  }
  function editReq(id) {
    const r = REQ.find(x => x.id === id); if (!r) return;
    openMod(`<div class="card pc wide" role="dialog" aria-modal="true"><button type="button" class="x" data-x aria-label="Close">&times;</button><h2 class="mt">Edit request</h2>${form(r)}</div>`, 'Edit request');
  }
  function confirmDel(id) {
    const r = REQ.find(x => x.id === id); if (!r) return;
    pend = id;
    openMod(`<div class="card pc" role="alertdialog" aria-modal="true"><h2 class="mt">Delete this request?</h2><p>The request for ${esc(r.patient)} will be removed and donors will no longer see it. This cannot be undone.</p><div class="acts2"><button type="button" class="btn g" data-x>Keep it</button><button type="button" class="btn" data-yes>Delete request</button></div></div>`, 'Confirm delete');
  }
  function posted() {
    const o = $('#ok'); o.classList.add('on'); o.setAttribute('aria-hidden', 'false');
    setTimeout(() => { o.classList.remove('on'); o.setAttribute('aria-hidden', 'true'); go('mine'); }, ST.calm ? 600 : 2300);
  }

  /* ---------- events ---------- */
  $('#nav').innerHTML = NAV.map(([k, t]) => `<button type="button" data-v="${k}">${ic(IC[k])}<span>${t}</span></button>`).join('');
  $('#tabs').innerHTML = [['dash', 'Home'], ['mine', 'Requests'], ['neu', 'New', 1], ['msgs', 'Messages'], ['menu', 'Menu']].map(([k, t, c]) => `<button type="button" data-v="${k}" class="${c ? 'cta' : ''}" ${c ? 'aria-label="New request"' : ''}>${c ? `<span class="ico">${ic(IC.neu)}</span>` : ic(IC[k])}<span>${t}</span></button>`).join('');
  $('#logout').innerHTML = ic(IC.out) + '<span>Log out</span>';
  $('#av').textContent = (me.first[0] || 'R').toUpperCase();
  document.body.classList.toggle('calm', !!ST.calm);
  const theme = () => { document.documentElement.classList.toggle('light', !!ST.light); const m = $('meta[name=theme-color]'); if (m) m.content = ST.light ? '#fff8f8' : '#0b0508'; };
  theme();

  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === 'prof') { side(false); profile(); return; }
    if (b.dataset.v === 'msgs') act = null;
    go(b.dataset.v);
  });
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === 'menu') return side(true);
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
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#modal').classList.contains('on')) closeMod(); else side(false);
  });
  /* keep Tab inside an open dialog */
  document.addEventListener('keydown', e => {
    const m = $('#modal'); if (e.key !== 'Tab' || !m.classList.contains('on')) return;
    const f = $$('button:not([disabled]),input,select,textarea,a[href]', m); if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  $('#modal').addEventListener('click', e => {
    if (e.target === e.currentTarget || e.target.closest('[data-x]')) return closeMod();
    if (e.target.closest('[data-yes]') && pend) {
      REQ = REQ.filter(r => r.id !== pend); saveR(); closeMod(); toast('Request deleted'); go('mine');
    }
  });

  $('#view').addEventListener('click', e => {
    const q = s => e.target.closest(s);
    let x;
    if ((x = q('[data-dm]'))) { e.stopPropagation(); return openChat(x.dataset.dm); }
    if ((x = q('[data-fd]'))) return focusDonor(x.dataset.fd);
    if ((x = q('[data-go]'))) return go(x.dataset.go);
    if ((x = q('[data-f]'))) { setFilter(x.dataset.f); if (x.closest('#cp')) { $('#mapc').scrollIntoView({ behavior: ST.calm ? 'auto' : 'smooth', block: 'center' }); } return; }
    if ((x = q('[data-t]'))) { $$('#cps button').forEach(b => { const on = b === x; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); $('#cp').innerHTML = compat(x.dataset.t); return; }
    if ((x = q('[data-m]'))) return setMonth(+x.dataset.m);
    if ((x = q('[data-h]'))) return pickH(+x.dataset.h);
    if ((x = q('[data-c]'))) { act = x.dataset.c; return paintChat(true); }
    if (q('[data-bk]')) { act = null; return paintChat(); }
    if ((x = q('[data-ed]'))) return editReq(x.dataset.ed);
    if ((x = q('[data-del]'))) return confirmDel(x.dataset.del);
    if ((x = q('[data-fu]'))) {
      const i = REQ.findIndex(r => r.id === x.dataset.fu); if (i < 0) return;
      HIST.unshift({ ...REQ.splice(i, 1)[0], status: 'fulfilled' }); saveR(); toast('Marked as fulfilled. Moved to History.'); go('mine');
    }
  });
  $('#view').addEventListener('change', e => {
    if (e.target.id === 'mo') return setMonth(+e.target.value);
    const k = e.target.dataset.k; if (!k || e.target.type !== 'checkbox') return;
    if (k === 'dark') ST.light = !e.target.checked; else ST[k] = e.target.checked;
    saveS();
    if (k === 'calm') document.body.classList.toggle('calm', ST.calm);
    if (k === 'dark') theme();
    toast('Setting saved');
  });

  /* request form (new page and edit dialog) and chat */
  document.addEventListener('input', e => {
    const f = e.target.closest('.rform'); if (!f) return;
    const box = e.target.closest('.fld');
    if (box) { box.classList.remove('bad'); const fe = $('.fe', box); if (fe) fe.textContent = ''; }
    const pv = $('#pv'); if (pv && !f.dataset.edit) pv.innerHTML = pvHTML(readForm(f, false));
  });
  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.matches('.rform')) {
      e.preventDefault();
      const v = readForm(f, true); if (!v) return;
      if (f.dataset.edit) {
        const r = REQ.find(x => x.id === f.dataset.edit);
        if (r) { Object.assign(r, v); saveR(); }
        closeMod(); toast('Request updated'); go('mine');
      } else {
        REQ.unshift({ id: 'r' + Date.now(), made: Date.now(), ...v }); saveR(); posted();
      }
      return;
    }
    if (f.id === 'cf') {
      e.preventDefault();
      const i = $('#ci'), x = i.value.trim(), id = act;
      if (!x || !id) return;
      CV[id].m.push({ me: 1, x }); saveC(); paintChat(true);
      setTimeout(() => { if (act === id && cur === 'msgs' && $('#ms')) { $('#ms').insertAdjacentHTML('beforeend', '<div class="m ty"><i></i><i></i><i></i></div>'); $('#ms').scrollTop = 1e9; } }, 500);
      setTimeout(() => {
        CV[id].m.push({ x: REPLY[Math.random() * REPLY.length | 0] }); saveC();
        if (act === id && cur === 'msgs') paintChat(); else if (ST.alerts) toast(CV[id].n + ' replied to your message');
      }, 1900);
    }
  });
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card');
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }
  });

  /* live countdowns, and archive requests as soon as their date passes */
  setInterval(() => {
    if (sweep() && ['dash', 'mine', 'hist'].includes(cur) && !$('#modal').classList.contains('on')) return go(cur);
    $$('[data-dl]').forEach(el => { el.textContent = left(+el.dataset.dl - Date.now()); });
  }, 30000);

  const h0 = location.hash.slice(1);
  go(V[h0] ? h0 : 'dash');
})();
