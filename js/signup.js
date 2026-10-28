/* LifeDrop: multi-step signup. Load AFTER js/script.js */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function init() {
    const form = $('#signupForm');
    if (!form) return;
    form.classList.add('su-form');

    const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const LABELS = ['Account', 'Role', 'Details'];

    const fld = (id, label, o = {}) =>
      `<div class="field"><input type="${o.type || 'text'}" id="${id}" name="${id}" placeholder=" " ${o.attrs || ''} ${o.opt ? '' : 'required'}>` +
      `<label for="${id}">${label}</label><small class="error"></small></div>`;
    const sel = (id, label, opts, o = {}) =>
      `<div class="field"><select id="${id}" name="${id}" ${o.opt ? '' : 'required'}><option value disabled selected></option>` +
      `${opts.map(x => `<option>${x}</option>`).join('')}</select><label for="${id}">${label}</label><small class="error"></small></div>`;
    const chips = (name, legend, optional) =>
      `<fieldset class="su-chips" ${optional ? 'data-optional="1"' : ''}><legend>${legend}</legend><div class="su-chip-grid">` +
      GROUPS.map(g => `<label class="su-chip"><input type="radio" name="${name}" value="${g}"><span>${g}</span></label>`).join('') +
      `</div><small class="su-err"></small></fieldset>`;
    const role = (v, t, d) =>
      `<label class="su-role"><input type="radio" name="role" value="${v}"><strong>${t}</strong><span>${d}</span></label>`;
    const pw = (id, label) =>
      `<div class="field"><input type="password" id="${id}" name="${id}" placeholder=" " autocomplete="new-password" required>` +
      `<label for="${id}">${label}</label><button type="button" class="pw-toggle" aria-label="Show password">Show</button><small class="error"></small></div>`;

    form.innerHTML = `
      <div class="su-progress" aria-hidden="true"><i></i></div>
      <p class="su-note" hidden></p>

      <section class="su-step" data-step="0">
        <h3 class="su-title">Create your account</h3>
        <p class="su-sub">Start with the basics. It takes under a minute.</p>
        <div class="su-row">
          ${fld('suFirst', 'First name', { attrs: 'autocomplete="given-name"' })}
          ${fld('suLast', 'Last name', { attrs: 'autocomplete="family-name"' })}
        </div>
        ${fld('suEmail', 'Email address', { type: 'email', attrs: 'autocomplete="email"' })}
        <div class="su-pw">
          ${pw('suPass', 'Create password')}
          <span class="su-meter" data-level="0"><i></i></span>
          <small class="su-hint">Use 8+ characters. Mix upper and lower case, numbers and symbols.</small>
          ${pw('suPass2', 'Confirm password')}
        </div>
      </section>

      <section class="su-step" data-step="1">
        <h3 class="su-title">How will you use LifeDrop?</h3>
        <p class="su-sub">Choose the option that fits you best.</p>
        <div class="su-roles" role="radiogroup" aria-label="Your role">
          ${role('donor', 'Donor', 'I want to donate blood and help people nearby.')}
          ${role('receiver', 'Receiver', 'I, or someone I know, needs blood.')}
          ${role('hospital', 'Hospital', 'I represent a hospital or blood bank.')}
        </div>
        <small class="su-err"></small>
      </section>

      <section class="su-step" data-step="2">
        <div class="su-panel" data-role="donor" hidden>
          <h3 class="su-title">Your donor details</h3>
          <p class="su-sub">Hospitals use these to find the right donor quickly.</p>
          ${chips('donorGroup', 'Your blood group')}
          ${fld('suDPhone', 'Phone number', { type: 'tel', attrs: 'autocomplete="tel"' })}
          <fieldset><legend>Current address</legend>
            <div class="su-row">${fld('suDCountry', 'Country', { attrs: 'autocomplete="country-name"' })}${fld('suDCity', 'City', { attrs: 'autocomplete="address-level2"' })}</div>
            <div class="su-row">${fld('suDDistrict', 'District')}${fld('suDStreet', 'Street', { attrs: 'autocomplete="street-address"' })}</div>
          </fieldset>
          ${sel('suDLast', 'Last donation (optional)', ['Never donated', 'Within the last 3 months', '3 to 6 months ago', 'More than 6 months ago'], { opt: true })}
          <label class="su-check"><input type="checkbox" name="available" checked><span>I’m available to donate when someone nearby needs blood.</span></label>
        </div>

        <div class="su-panel" data-role="receiver" hidden>
          <h3 class="su-title">Your contact details</h3>
          <p class="su-sub">So donors and hospitals can reach you in an emergency.</p>
          ${fld('suRPhone', 'Phone number', { type: 'tel', attrs: 'autocomplete="tel"' })}
          ${fld('suRCountry', 'Country', { attrs: 'autocomplete="country-name"' })}
          ${chips('needGroup', 'Blood group needed (if known)', true)}
        </div>

        <div class="su-panel" data-role="hospital" hidden>
          <h3 class="su-title">Your hospital details</h3>
          <p class="su-sub">Patients and donors will see these when you post a request.</p>
          ${fld('suHName', 'Hospital name')}
          ${fld('suHLoc', 'Hospital location')}
          ${fld('suHHot', 'Hotline or emergency number', { type: 'tel' })}
          ${fld('suHLic', 'Registration or license number (optional)', { opt: true })}
        </div>

        <div class="su-consent">
          <label class="su-check"><input type="checkbox" id="suConsent"><span>I agree to share these details with verified hospitals and donors on LifeDrop.</span></label>
          <small class="su-err"></small>
        </div>
      </section>

      <div class="su-actions">
        <button type="button" class="btn btn-ghost su-back" hidden>Back</button>
        <button type="submit" class="btn btn-primary su-next">Continue</button>
      </div>`;

    let order = [0, 1, 2], pos = 0, google = null;

    /* ---------- helpers ---------- */
    const fieldErr = (el, msg) => {
      const f = el.closest('.field');
      f.classList.toggle('is-invalid', !!msg);
      $('.error', f).textContent = msg || '';
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };
    const groupErr = (box, msg) => {
      $('.su-err', box).textContent = msg || '';
      return !msg;
    };
    const checkInput = el => {
      const v = el.value.trim();
      if (!v) return el.required ? 'This field is required.' : '';
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
      if (el.id === 'suPass' && v.length < 8) return 'Use at least 8 characters.';
      if (el.id === 'suPass2' && v !== $('#suPass', form).value) return 'Passwords do not match.';
      if (el.type === 'tel' && !/^\+?[\d\s\-()]{7,18}$/.test(v)) return 'Enter a valid phone number.';
      return '';
    };
    const live = el => !el.closest('[hidden]');

    function validate(idx) {
      const root = $(`.su-step[data-step="${idx}"]`, form);
      let ok = true, first = null;
      const miss = el => { ok = false; first = first || el; };
      $$('input:not([type=radio]):not([type=checkbox]),select', root).filter(live)
        .forEach(el => { if (!fieldErr(el, checkInput(el))) miss(el); });
      if (idx === 1) {
        const picked = $('input[name=role]:checked', root);
        if (!groupErr(root, picked ? '' : 'Choose how you will use LifeDrop.')) miss($('input', root));
      }
      if (idx === 2) {
        $$('.su-chips', root).filter(live).forEach(box => {
          if (box.dataset.optional) return;
          if (!groupErr(box, $('input:checked', box) ? '' : 'Select a blood group.')) miss($('input', box));
        });
        const c = $('#suConsent', form);
        if (!groupErr(c.closest('.su-consent'), c.checked ? '' : 'Please confirm to continue.')) miss(c);
      }
      if (first) first.focus();
      return ok;
    }

    function meter() {
      const v = $('#suPass', form).value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      const m = $('.su-meter', form);
      m.style.setProperty('--s', v ? Math.max(s, 1) : 0);
      m.dataset.level = v ? Math.max(s, 1) : 0;
    }

    const showPanel = r => $$('.su-panel', form).forEach(p => { p.hidden = p.dataset.role !== r; });

    function paint(dir, focus) {
      const prog = $('.su-progress', form);
      $$('.su-dot', prog).forEach(d => d.remove());
      order.forEach((idx, i) => {
        const d = document.createElement('span');
        d.className = 'su-dot' + (i < pos ? ' is-done' : i === pos ? ' is-now' : '');
        d.innerHTML = `<b>${i < pos ? '✓' : i + 1}</b><em>${LABELS[idx]}</em>`;
        prog.append(d);
      });
      prog.style.setProperty('--p', order.length > 1 ? pos / (order.length - 1) : 0);
      form.style.setProperty('--dir', dir);
      $$('.su-step', form).forEach(s => s.classList.toggle('is-active', +s.dataset.step === order[pos]));
      $('.su-back', form).hidden = pos === 0;
      $('.su-next', form).textContent = pos === order.length - 1 ? (google ? 'Finish setup' : 'Create account') : 'Continue';
      if (focus) {
        const f = $$('.su-step.is-active input,.su-step.is-active select', form)
          .find(el => live(el) && !['radio', 'checkbox'].includes(el.type) && !el.readOnly);
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 80);
      }
    }

    function reset() {
      google = null; order = [0, 1, 2]; pos = 0;
      form.reset();
      $$('.field.is-invalid', form).forEach(f => f.classList.remove('is-invalid'));
      $$('.error,.su-err', form).forEach(e => { e.textContent = ''; });
      $('#suEmail', form).readOnly = false;
      $('.su-pw', form).hidden = false;
      $('.su-note', form).hidden = true;
      showPanel('');
      meter();
      paint(1, false);
    }

    /* Call this from your real Google sign-in callback:
       LifeDropSignup.completeProfile({ firstName, lastName, email }) */
    function completeProfile(p = {}) {
      reset();
      google = { ...p };
      const known = p.firstName && p.lastName && p.email;
      order = known ? [1, 2] : [0, 1, 2];
      $('#suFirst', form).value = p.firstName || '';
      $('#suLast', form).value = p.lastName || '';
      $('#suEmail', form).value = p.email || '';
      $('#suEmail', form).readOnly = !!p.email;
      $('.su-pw', form).hidden = true;
      const n = $('.su-note', form);
      n.textContent = p.email ? `Signed in with Google as ${p.email}. Add a few details to finish.` : 'Signed in with Google. Add a few details to finish.';
      n.hidden = false;
      const tab = $('[data-tab="signup"]');
      if (tab) tab.click();
      paint(1, true);
    }

    function finish() {
      const r = $('input[name=role]:checked', form).value;
      const panel = $(`.su-panel[data-role="${r}"]`, form);
      const details = {};
      $$('input,select', panel).forEach(el => {
        if (el.type === 'radio') { if (el.checked) details[el.name] = el.value; }
        else if (el.type === 'checkbox') details[el.name] = el.checked;
        else if (el.value.trim()) details[el.name] = el.value.trim();
      });
      const profile = {
        firstName: $('#suFirst', form).value.trim(),
        lastName: $('#suLast', form).value.trim(),
        email: $('#suEmail', form).value.trim(),
        role: r,
        provider: google ? 'google' : 'email',
        details
      };
      /* Passwords are never stored in the browser. */
      try { localStorage.setItem('lifedrop_profile', JSON.stringify(profile)); } catch (e) { /* storage unavailable */ }
      /* Send to your backend by listening for this event. */
      document.dispatchEvent(new CustomEvent('lifedrop:signup', {
        detail: { ...profile, password: google ? undefined : $('#suPass', form).value }
      }));

      const set = (id, fn) => { const el = $(id); if (el) fn(el); };
      set('#authName', el => { el.textContent = 'Welcome, ' + profile.firstName; });
      set('#authEmail', el => { el.textContent = profile.email; });
      set('#authAvatar', el => { el.textContent = (profile.firstName[0] || '?').toUpperCase(); });
      set('#authGuest', el => { el.hidden = true; });
      set('#authUser', el => { el.hidden = false; });
      set('#toast', t => {
        t.textContent = 'Welcome to LifeDrop, ' + profile.firstName + '.';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3200);
      });
      reset();
    }

    /* ---------- events ---------- */
    form.addEventListener('submit', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!validate(order[pos])) return;
      if (pos < order.length - 1) { pos++; paint(1, true); } else finish();
    }, true);

    $('.su-back', form).addEventListener('click', () => { if (pos > 0) { pos--; paint(-1, true); } });

    form.addEventListener('input', e => {
      const el = e.target;
      if (el.closest('.field')) fieldErr(el, '');
      if (el.id === 'suPass') meter();
      const box = el.closest('.su-chips,.su-consent');
      if (box) groupErr(box, '');
      if (el.name === 'role') { groupErr($('.su-step[data-step="1"]', form), ''); showPanel(el.value); }
    });

    form.addEventListener('click', e => {
      const t = e.target.closest('.pw-toggle');
      if (!t) return;
      e.stopPropagation();
      const input = $('input', t.closest('.field'));
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      t.textContent = show ? 'Hide' : 'Show';
      t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    /* Demo hook: on the Sign up tab, Google opens the profile step.
       Replace with your real OAuth flow and call completeProfile() from its callback. */
    const gb = $('#googleBtn');
    if (gb) gb.addEventListener('click', e => {
      const tab = $('[data-tab="signup"]');
      if (tab && tab.classList.contains('active')) { e.stopImmediatePropagation(); completeProfile({}); }
    }, true);

    window.LifeDropSignup = { completeProfile };
    reset();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
