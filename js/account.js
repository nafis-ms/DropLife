/* LifeDrop account settings, shared by the donor, receiver and hospital dashboards.
   Usage:  LifeDropAccount.mount(element, { role, toast, onSaved(profile, session) })

   - Details (name, email, phone, address, blood group) are saved to localStorage after the Save button is pressed.
   - Passwords are never stored in the browser. A valid change is announced with a "lifedrop:password-change"
     event so your backend can apply it, and every details save fires "lifedrop:account-update". */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const J = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const W = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const digits = v => v.replace(/\D/g, '').length;
  const okPhone = v => /^[+\d][\d\s()\-]{6,}$/.test(v) && digits(v) >= 7 && digits(v) <= 15;
  const DEMO_PASSWORD = '12345678'; /* matches the demo accounts in js/script.js */

  /* f = [key, label, source ('p' = profile, 'd' = profile.details), options]  */
  const NAME = [['firstName', 'First name', 'p', { req: 1, ac: 'given-name' }], ['lastName', 'Last name', 'p', { ac: 'family-name' }]];
  const EM = ['email', 'Email address', 'p', { req: 1, type: 'email', ac: 'email' }];
  const SPEC = {
    donor: {
      title: 'Your details',
      rows: [NAME, [EM, ['suDPhone', 'Phone number', 'd', { req: 1, type: 'tel', ac: 'tel', phone: 1 }]]],
      address: [[['suDCountry', 'Country', 'd', { ac: 'country-name' }], ['suDCity', 'City', 'd', { ac: 'address-level2' }]], [['suDDistrict', 'District', 'd', {}], ['suDStreet', 'Street', 'd', { ac: 'street-address' }]]],
      group: { key: 'donorGroup', label: 'Your blood group', req: 1 }
    },
    receiver: {
      title: 'Your details',
      rows: [NAME, [EM, ['suRPhone', 'Phone number', 'd', { req: 1, type: 'tel', ac: 'tel', phone: 1 }]], [['suRCountry', 'Country', 'd', { req: 1, ac: 'country-name' }], ['suRAddress', 'Address (optional)', 'd', { ac: 'street-address' }]]],
      group: { key: 'needGroup', label: 'Blood group needed (if known)', req: 0 }
    },
    hospital: {
      title: 'Hospital details',
      rows: [[['suHName', 'Hospital name', 'd', { req: 1 }]], [['firstName', 'Contact person first name', 'p', { req: 1, ac: 'given-name' }], ['lastName', 'Contact person last name', 'p', { ac: 'family-name' }]],
        [EM, ['suHHot', 'Hotline or emergency number', 'd', { req: 1, type: 'tel', ac: 'tel', phone: 1 }]], [['suHLoc', 'Hospital address', 'd', { req: 1, ac: 'street-address' }]], [['suHLic', 'Registration or license number (optional)', 'd', {}]]]
    }
  };

  const val = (P, k, src) => String(src === 'p' ? (P[k] || '') : ((P.details || {})[k] || ''));
  const fieldHTML = (P, [k, label, src, o]) => `<div class="fld"><label for="ac-${k}">${esc(label)}</label><input id="ac-${k}" name="${k}" data-src="${src}" type="${o.type || 'text'}" value="${esc(val(P, k, src))}" autocomplete="${o.ac || 'off'}"${o.type === 'tel' ? ' inputmode="tel"' : ''}><small class="fe"></small></div>`;
  const rowHTML = (P, row) => { const cells = Array.isArray(row[0]) ? row : [row]; return `<div class="${cells.length > 1 ? 'f2' : ''}">${cells.map(c => fieldHTML(P, c)).join('')}</div>`; };
  const groupHTML = (P, g) => { const cur = val(P, g.key, 'd'); return `<fieldset class="fld" data-k="group"><legend>${esc(g.label)}</legend><div class="ag" role="radiogroup">${G.map(x => `<label><input type="radio" name="${g.key}" value="${x}" ${cur === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}${g.req ? '' : `<label class="none"><input type="radio" name="${g.key}" value="" ${cur ? '' : 'checked'}><span>Not sure</span></label>`}</div><small class="fe"></small></fieldset>`; };

  const pwField = (id, label, ac) => `<div class="fld"><label for="${id}">${label}</label><div class="pwr"><input id="${id}" name="${id}" type="password" autocomplete="${ac}"><button type="button" class="pwt" data-pw="${id}" aria-label="Show ${label.toLowerCase()}">Show</button></div><small class="fe"></small></div>`;

  function mount(root, ctx) {
    if (!root) return;
    const role = ctx.role, spec = SPEC[role], toast = ctx.toast || (() => {});
    const P = J('lifedrop_profile') || {}, U = J('lifedrop-user') || {};
    const fields = [...spec.rows.flat().flatMap(c => Array.isArray(c[0]) ? c : [c]), ...(spec.address ? spec.address.flat() : [])].filter(f => typeof f[0] === 'string');
    root.classList.add('acct');
    if ($('#tabs')) root.classList.add('has-tabs');

    const snap = f => JSON.stringify(read(f));
    function read(f) {
      const o = {}; fields.forEach(([k]) => { o[k] = f.elements[k].value.trim(); });
      if (spec.group) o[spec.group.key] = (($(`[name=${spec.group.key}]:checked`, f)) || {}).value || '';
      return o;
    }
    const render = () => {
      const P2 = J('lifedrop_profile') || P;
      root.innerHTML = `<section class="card acc-card" style="--i:0"><div class="hd"><h3>${esc(spec.title)}</h3><span class="st" id="acs">All changes saved</span></div>
<form id="acf" novalidate>${spec.rows.map(r => rowHTML(P2, r)).join('')}${spec.address ? `<fieldset class="adr"><legend>Current address</legend>${spec.address.map(r => rowHTML(P2, r)).join('')}</fieldset>` : ''}${spec.group ? groupHTML(P2, spec.group) : ''}
<div class="bar"><button type="button" class="btn g" id="acd" disabled>Discard</button><button type="submit" class="btn" id="acb" disabled>Save changes</button></div></form></section>
${P2.provider === 'google' ? `<section class="card acc-card" style="--i:1"><div class="hd"><h3>Password</h3></div><p class="mut">You signed in with Google, so there is no LifeDrop password to change.</p></section>` : `<section class="card acc-card" style="--i:1"><div class="hd"><h3>Change password</h3></div>
<form id="acp" novalidate autocomplete="off">${pwField('pw0', 'Current password', 'current-password')}${pwField('pw1', 'New password', 'new-password')}${pwField('pw2', 'Confirm new password', 'new-password')}<small class="mut">Use at least 8 characters.</small>
<div class="bar"><button type="submit" class="btn" id="acpb">Update password</button></div></form></section>`}`;
      const f = $('#acf', root); f._snap = snap(f);
    };
    render();

    const dirty = f => { const d = snap(f) !== f._snap; $('#acb', root).disabled = !d; $('#acd', root).disabled = !d; const s = $('#acs', root); s.textContent = d ? 'Unsaved changes' : 'All changes saved'; s.classList.toggle('dirty', d); return d; };
    const err = (f, k, msg) => { const box = k === 'group' ? $('[data-k=group]', f) : f.elements[k].closest('.fld'); box.classList.toggle('bad', !!msg); $('.fe', box).textContent = msg || ''; return msg ? (k === 'group' ? $('input', box) : f.elements[k]) : null; };

    root.addEventListener('input', e => {
      const f = e.target.closest('form'); if (!f) return;
      const box = e.target.closest('.fld'); if (box) { box.classList.remove('bad'); const fe = $('.fe', box); if (fe) fe.textContent = ''; }
      if (f.id === 'acf') dirty(f);
    });
    root.addEventListener('change', e => { const f = e.target.closest('#acf'); if (f) dirty(f); });
    root.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.id === 'acd') { render(); return; }
      if (t.dataset.pw) { const i = $('#' + t.dataset.pw, root), show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.textContent = show ? 'Hide' : 'Show'; }
    });

    root.addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      if (f.id === 'acf') return saveDetails(f);
      if (f.id === 'acp') return savePassword(f);
    });

    function saveDetails(f) {
      const v = read(f), bad = [];
      fields.forEach(([k, label, src, o]) => {
        let m = '';
        if (o.req && !v[k]) m = k === 'email' ? 'Enter your email address.' : `Enter ${label.toLowerCase()}.`;
        else if (k === 'email' && !EMAIL.test(v[k])) m = 'Enter a valid email address.';
        else if (o.phone && !okPhone(v[k])) m = 'Enter a valid phone number.';
        bad.push(err(f, k, m));
      });
      if (spec.group) bad.push(err(f, 'group', spec.group.req && !v[spec.group.key] ? 'Select a blood group.' : ''));
      const first = bad.find(Boolean); if (first) { first.focus(); return; }

      const old = J('lifedrop_profile') || {}, oldU = J('lifedrop-user') || {}, prevEmail = String(old.email || oldU.email || '').toLowerCase();
      const details = { ...(old.details || {}) };
      fields.forEach(([k, , src]) => { if (src === 'd') { if (v[k]) details[k] = v[k]; else delete details[k]; } });
      if (spec.group) { if (v[spec.group.key]) details[spec.group.key] = v[spec.group.key]; else delete details[spec.group.key]; }
      const P2 = { ...old, firstName: v.firstName, lastName: v.lastName || '', email: v.email, details };
      const U2 = { ...oldU, name: (v.firstName + ' ' + (v.lastName || '')).trim() || v.email, email: v.email };

      /* Data that dashboards keep per email (ldr_*, ldh_*) moves with the account, so nothing is orphaned. */
      const newEmail = v.email.toLowerCase();
      if (prevEmail && newEmail !== prevEmail) {
        try {
          const moves = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^(ldr|ldh)_/.test(k) && k.endsWith('_' + prevEmail)) moves.push(k); }
          moves.forEach(k => { const nk = k.slice(0, k.length - prevEmail.length) + newEmail; if (localStorage.getItem(nk) === null) { localStorage.setItem(nk, localStorage.getItem(k)); localStorage.removeItem(k); } });
        } catch (x) { /* storage unavailable */ }
      }
      if (!W('lifedrop_profile', P2) || !W('lifedrop-user', U2)) { toast('Could not save. Browser storage is unavailable.'); return; }
      document.dispatchEvent(new CustomEvent('lifedrop:account-update', { detail: { previousEmail: prevEmail, ...P2 } }));
      if (ctx.onSaved) ctx.onSaved(P2, U2);
      render(); toast('Your details were saved');
    }

    function savePassword(f) {
      const P2 = J('lifedrop_profile') || P, a = f.elements.pw0.value, b = f.elements.pw1.value, c = f.elements.pw2.value;
      const bad = [
        err(f, 'pw0', !a ? 'Enter your current password.' : (P2.provider === 'demo' && a !== DEMO_PASSWORD) ? 'That is not your current password.' : ''),
        err(f, 'pw1', b.length < 8 ? 'Use at least 8 characters.' : b === a ? 'Choose a password you have not used here.' : ''),
        err(f, 'pw2', c !== b ? 'The passwords do not match.' : '')
      ];
      const first = bad.find(Boolean); if (first) { first.focus(); return; }
      document.dispatchEvent(new CustomEvent('lifedrop:password-change', { detail: { email: P2.email, currentPassword: a, newPassword: b } }));
      f.reset(); $$('.pwt', f).forEach(t => { t.textContent = 'Show'; $('#' + t.dataset.pw, f).type = 'password'; });
      /* Demo accounts sign in with a fixed password, so only a real backend can apply the change. */
      toast(P2.provider === 'demo' ? 'Checked. Demo accounts keep the password 12345678.' : 'Password update sent');
    }
  }

  window.LifeDropAccount = { mount };
})();
