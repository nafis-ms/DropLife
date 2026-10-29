(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /*  Data  */
  const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const CAN_DONATE_TO = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
  };
  const DONORS = [];
  const HOSPITALS = [];

  /*  Preloader  */
  const preloader = $("#preloader");
  const hidePreloader = () => {
    preloader.classList.add("done");
    document.body.classList.remove("locked");
  };
  document.body.classList.add("locked");
  window.addEventListener("load", () =>
    setTimeout(hidePreloader, reduceMotion ? 0 : 900),
  );
  setTimeout(hidePreloader, 4000);

  /*  Header: scroll state, progress, back to top  */
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");
  let lastY = 0,
    ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle("scrolled", y > 30);
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    toTop.classList.toggle("show", y > 700);
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true },
  );
  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" }),
  );

  /*  Mobile menu (cinematic drawer)  */
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  const mmenu = $("#mobileMenu");
  const mmPanel = $("#mmenuPanel");
  const mqMobile = matchMedia("(max-width: 820px)");
  let menuOpen = false;
  let lastFocus = null;

  const toggleMenu = (force) => {
    const open = force ?? !menuOpen;
    if (open === menuOpen) return;
    if (open && !mqMobile.matches) return;
    menuOpen = open;

    if (open) {
      // iris reveal originates from the burger button
      const r = burger.getBoundingClientRect();
      mmenu.style.setProperty("--mx", r.left + r.width / 2 + "px");
      mmenu.style.setProperty("--my", r.top + r.height / 2 + "px");
      lastFocus = document.activeElement;
      mmenu.scrollTop = mmPanel.scrollTop = 0;
    }

    mmenu.classList.toggle("open", open);
    mmenu.setAttribute("aria-hidden", !open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    if ("inert" in mmenu) mmenu.inert = !open;

    if (open) {
      setTimeout(() => $(".mm-close", mmenu).focus({ preventScroll: true }), 450);
    } else if (lastFocus) {
      lastFocus.focus?.({ preventScroll: true });
    }
  };
  if ("inert" in mmenu) mmenu.inert = true;

  burger.addEventListener("click", () => toggleMenu());
  $$("[data-mclose]", mmenu).forEach((el) =>
    el.addEventListener("click", () => toggleMenu(false)),
  );
  // navigate: close first, then scroll once the iris has started closing
  $$("[data-mlink]", mmenu).forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id && id.length > 1 ? $(id) : null;
      toggleMenu(false);
      if (target) {
        e.preventDefault();
        setTimeout(
          () => target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }),
          reduceMotion ? 0 : 350,
        );
        history.replaceState(null, "", id);
      }
    }),
  );
  const mmEm = $("#mmEmergency");
  if (mmEm)
    mmEm.addEventListener("click", () => {
      toggleMenu(false);
      setTimeout(() => $("#emergencyBtn").click(), reduceMotion ? 0 : 450);
    });
  // keyboard: Esc closes, Tab stays inside the drawer
  document.addEventListener("keydown", (e) => {
    if (!menuOpen) return;
    if (e.key === "Escape") return toggleMenu(false);
    if (e.key !== "Tab") return;
    const f = $$("a[href], button:not([disabled])", mmPanel);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  // swipe right (or up) to dismiss
  let tx = 0, ty = 0;
  mmPanel.addEventListener("touchstart", (e) => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  mmPanel.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if ((dx > 90 && Math.abs(dy) < 60) || (dy < -120 && Math.abs(dx) < 60))
      toggleMenu(false);
  }, { passive: true });
  // leaving mobile width closes it
  const onMq = () => { if (!mqMobile.matches) toggleMenu(false); };
  mqMobile.addEventListener?.("change", onMq);

  /*  Scroll spy  */
  const sections = $$("main section[id]");
  const links = [...$$("a", navLinks), ...$$(".mmenu-nav a")];
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) =>
            l.classList.toggle(
              "active",
              l.getAttribute("href") === "#" + e.target.id,
            ),
          );
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((s) => spy.observe(s));

  /*  Reveal on scroll  */
  const revealObs = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  $$(".reveal").forEach((el) => {
    if (!el.closest(".hero")) revealObs.observe(el);
  });

  /*  Count-up  */
  const countObs = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target,
          target = +el.dataset.count,
          dur = 2200,
          t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(target * eased).toLocaleString();
          if (p < 1) requestAnimationFrame(tick);
        };
        reduceMotion ?
          (el.textContent = target.toLocaleString())
        : requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    },
    { threshold: 0.6 },
  );
  $$("[data-count]").forEach((el) => countObs.observe(el));

  /*  Hero parallax  */
  const heroVisual = $("#heroVisual");
  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    $(".hero").addEventListener("mousemove", (e) => {
      const x = (e.clientX / innerWidth - 0.5) * 28;
      const y = (e.clientY / innerHeight - 0.5) * 28;
      heroVisual.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  /*  3D tilt cards  */
  if (!reduceMotion && matchMedia("(hover: hover)").matches) {
    $$(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`;
      });
      card.addEventListener("mouseleave", () => (card.style.transform = ""));
    });
  }

  /*  Button ripple  */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;
    const r = btn.getBoundingClientRect(),
      size = Math.max(r.width, r.height);
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });

  /*  Blood group compatibility  */
  const picker = $("#groupPicker");
  const result = $("#compatResult");
  const DEFAULT_COMPAT_TEXT = result.innerHTML;
  GROUPS.forEach((g) => {
    const b = document.createElement("button");
    b.className = "group-btn";
    b.type = "button";
    b.textContent = g;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      // clicking the selected group again clears it
      const wasActive = b.classList.contains("active");
      $$(".group-btn", picker).forEach((x) => {
        x.classList.remove("active");
        x.setAttribute("aria-pressed", "false");
      });
      if (!wasActive) {
        b.classList.add("active");
        b.setAttribute("aria-pressed", "true");
      }
      result.style.opacity = 0;
      setTimeout(() => {
        result.innerHTML = wasActive
          ? DEFAULT_COMPAT_TEXT
          : `<strong>${g}</strong> can donate to: ${CAN_DONATE_TO[g].join(", ")}`;
        result.style.opacity = 1;
      }, 200);
    });
    picker.appendChild(b);
  });

  /*  Donors  */
  const filters = $("#donorFilters");
  const grid = $("#donorGrid");
  let activeGroup = "All";

  ["All", ...GROUPS].forEach((g) => {
    const c = document.createElement("button");
    c.className = "chip" + (g === "All" ? " active" : "");
    c.type = "button";
    c.textContent = g;
    c.addEventListener("click", () => {
      $$(".chip", filters).forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      activeGroup = g;
      renderDonors();
    });
    filters.appendChild(c);
  });

  function renderDonors() {
    const list = DONORS.filter(
      (d) => activeGroup === "All" || d.group === activeGroup,
    );
    grid.innerHTML =
      list.length ?
        list
          .map(
            (d, i) => `
            <article class="donor-card" style="animation-delay:${i * 70}ms">
                <div class="avatar">${d.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}</div>
                <h4>${d.name}</h4>
                <p class="loc">${d.city}</p>
                <span class="badge">${d.group}</span>
                <div class="status ${d.ok ? "" : "off"}"><i></i>${d.ok ? "Available to donate" : "Available soon"}</div>
                <button class="btn btn-primary" type="button" data-contact="${d.name}" ${d.ok ? "" : 'disabled style="opacity:.5;pointer-events:none"'}>Contact</button>
            </article>`,
          )
          .join("")
      : `<p class="empty-state">${DONORS.length ? "No donors found for this group yet." : "No donors registered yet. Be the first to join LifeDrop."}</p>`;
  }
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-contact]");
    if (b) toast(`Request sent to ${b.dataset.contact}`);
  });
  renderDonors();

  /*  Hospitals  */
  const hGrid = $("#hospitalGrid");
  hGrid.innerHTML =
    !HOSPITALS.length ?
      '<p class="empty-state">Partner hospitals will be listed here soon.</p>'
    : HOSPITALS.map(
        (h, i) => `
        <article class="hospital reveal" style="--d:${i * 0.15}s">
            <h3>${h.name}</h3>
            <p class="addr">${h.addr}</p>
            ${Object.entries(h.stock)
              .map(
                ([g, v]) => `
                <div class="stock"><b>${g}</b><div class="bar"><i class="${v < 25 ? "low" : ""}" data-w="${v}"></i></div><span>${v}%</span></div>`,
              )
              .join("")}
        </article>`,
      ).join("");

  const barObs = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          $$(".bar i", e.target).forEach((b, i) =>
            setTimeout(() => (b.style.width = b.dataset.w + "%"), i * 120),
          );
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.3 },
  );
  $$(".hospital").forEach((h) => {
    revealObs.observe(h);
    barObs.observe(h);
  });

  /*  Modal  */
  const modal = $("#emergencyModal");
  const setModal = (open) => {
    modal.classList.toggle("open", open);
    modal.setAttribute("aria-hidden", !open);
    document.body.classList.toggle("locked", open);
  };
  $("#emergencyBtn").addEventListener("click", () => setModal(true));
  $$("[data-close]", modal).forEach((el) =>
    el.addEventListener("click", () => setModal(false)),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setModal(false);
  });

  /*  Forms  */
  function validate(form) {
    let ok = true;
    $$(".field", form).forEach((f) => {
      const input = $("input, textarea, select", f);
      const err = $(".error", f);
      let msg = "";
      const v = input.value.trim();
      if (!v) msg = "This field is required";
      else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        msg = "Enter a valid email";
      else if (input.dataset.min && v.length < +input.dataset.min)
        msg = `Use at least ${input.dataset.min} characters`;
      else if (input.type === "tel" && !/^[+\d][\d\s-]{6,}$/.test(v))
        msg = "Enter a valid phone number";
      f.classList.toggle("invalid", !!msg);
      err.textContent = msg;
      if (msg) ok = false;
    });
    return ok;
  }
  $$(".field input, .field textarea, .field select").forEach((i) =>
    i.addEventListener("input", () => {
      i.closest(".field").classList.remove("invalid");
      $(".error", i.closest(".field")).textContent = "";
    }),
  );

  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(e.target)) return;
    e.target.reset();
    toast("Message sent. We will reply soon.");
  });
  $("#emergencyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate(e.target)) return;
    e.target.reset();
    setModal(false);
    toast("Emergency alert sent to matching donors.");
  });

  /*  Toast  */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }


  /*  Auth: email + password, or Google  */
  // 1) Create an OAuth "Web application" client at
  //    https://console.cloud.google.com/apis/credentials
  // 2) Add your site's origin under "Authorized JavaScript origins"
  // 3) Paste the client ID below.
  const GOOGLE_CLIENT_ID = "";

  // Replace these two functions with real calls to your backend.
  // They must resolve to { name, email, picture? } or throw an Error.
  const authApi = {
    async login({ email }) {
      await new Promise((r) => setTimeout(r, 700));
      return { name: email.split("@")[0], email };
    },
    async signup({ name, email }) {
      await new Promise((r) => setTimeout(r, 800));
      return { name, email };
    },
  };

  const authModal = $("#authModal");
  const guestView = $("#authGuest");
  const userView = $("#authUser");
  const tabsEl = $(".auth-tabs", authModal);
  const loginForm = $("#loginForm");
  const signupForm = $("#signupForm");
  const googleBtn = $("#googleBtn");
  const accountBtns = [$("#accountBtn"), $("#mmAccount")].filter(Boolean);
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem("lifedrop-user") || "null");
  } catch (_) {}

  const setAuthModal = (open) => {
    authModal.classList.toggle("open", open);
    authModal.setAttribute("aria-hidden", !open);
    document.body.classList.toggle("locked", open);
    if (open) setTimeout(() => $("input:not([hidden])", authModal)?.focus({ preventScroll: true }), 450);
  };
  const setTab = (tab) => {
    tabsEl.dataset.active = tab;
    $$("button[data-tab]", tabsEl).forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    loginForm.hidden = tab !== "login";
    signupForm.hidden = tab !== "signup";
    $("#authTitle").textContent = tab === "login" ? "Welcome back" : "Join LifeDrop";
    $("#authSub").textContent =
      tab === "login" ? "Log in to manage your donor profile and requests."
      : "Create an account to become a donor or request blood.";
  };
  const paint = () => {
    const user = session;
    guestView.hidden = !!user;
    userView.hidden = !user;
    accountBtns.forEach((b) => (b.textContent = user ? user.name.split(" ")[0] : "Account"));
    if (user) {
      const av = $("#authAvatar");
      av.textContent = user.picture ? "" : user.name[0].toUpperCase();
      av.style.backgroundImage = user.picture ? `url("${user.picture}")` : "";
      $("#authName").textContent = user.name;
      $("#authEmail").textContent = user.email;
    }
  };
  const signIn = (user, msg) => {
    session = user;
    try {
      localStorage.setItem("lifedrop-user", JSON.stringify(user));
    } catch (_) {}
    paint();
    loginForm.reset();
    signupForm.reset();
    $$(".field", authModal).forEach((f) => f.classList.remove("invalid"));
    toast(msg || `Signed in as ${user.name}`);
  };

  accountBtns.forEach((b) =>
    b.addEventListener("click", () => {
      if (b.id === "mmAccount") {
        toggleMenu(false);
        setTimeout(() => setAuthModal(true), reduceMotion ? 0 : 450);
      } else setAuthModal(true);
    }),
  );
  $$("[data-aclose]", authModal).forEach((el) =>
    el.addEventListener("click", () => setAuthModal(false)),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && authModal.classList.contains("open")) setAuthModal(false);
  });
  $$("button[data-tab]", tabsEl).forEach((b) =>
    b.addEventListener("click", () => setTab(b.dataset.tab)),
  );
  // "Become a Donor" -> open the Sign up tab. If already signed in, fall
  // through to the normal link (scrolls to the donors section).
  $$("[data-open-signup]").forEach((b) =>
    b.addEventListener("click", (e) => {
      if (session) return;
      e.preventDefault();
      setTab("signup");
      setAuthModal(true);
    }),
  );
  $$(".pw-toggle", authModal).forEach((t) =>
    t.addEventListener("click", () => {
      const inp = $("input", t.parentElement);
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      inp.dataset.pw = "1";
      t.textContent = show ? "Hide" : "Show";
      t.setAttribute("aria-label", show ? "Hide password" : "Show password");
    }),
  );

  const submitAuth = async (form, fn) => {
    if (!validate(form)) return;
    const btn = $("button[type=submit]", form);
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Please wait…";
    try {
      const user = await fn();
      signIn(user);
      setAuthModal(false);
    } catch (err) {
      toast(err.message || "Something went wrong. Try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitAuth(loginForm, () =>
      authApi.login({ email: $("#lEmail").value.trim(), password: $("#lPass").value }),
    );
  });
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitAuth(signupForm, () =>
      authApi.signup({
        name: $("#sName").value.trim(),
        email: $("#sEmail").value.trim(),
        password: $("#sPass").value,
      }),
    );
  });

  // Google sign-in (Google Identity Services, loaded on first click)
  let gisPromise;
  const loadGis = () =>
    (gisPromise ||= new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error("Could not reach Google. Check your connection."));
      document.head.appendChild(s);
    }));
  googleBtn.addEventListener("click", async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast("Google sign-in needs a client ID. See GOOGLE_CLIENT_ID in script.js.");
      return;
    }
    googleBtn.disabled = true;
    try {
      await loadGis();
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (resp) => {
          try {
            if (resp.error) throw new Error("Google sign-in was cancelled.");
            const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${resp.access_token}` },
            });
            const u = await r.json();
            signIn({ name: u.name || u.email, email: u.email, picture: u.picture });
            setAuthModal(false);
          } catch (err) {
            toast(err.message);
          } finally {
            googleBtn.disabled = false;
          }
        },
        error_callback: () => {
          googleBtn.disabled = false;
          toast("Google sign-in was cancelled.");
        },
      });
      client.requestAccessToken();
    } catch (err) {
      googleBtn.disabled = false;
      toast(err.message);
    }
  });

  $("#logoutBtn").addEventListener("click", () => {
    session = null;
    try {
      localStorage.removeItem("lifedrop-user");
    } catch (_) {}
    paint();
    setAuthModal(false);
    toast("Signed out.");
  });
  paint();

  /*  Particles: floating blood cells  */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let W,
    H,
    cells = [],
    lastW = 0,
    maxH = 0,
    resizeTimer;
  // On phones the URL bar shows/hides while scrolling, which fires "resize"
  // with a different innerHeight. Rebuilding the canvas every time cleared it
  // and re-randomised every cell (visible flicker/jumps). Now the canvas is
  // only rebuilt when the width changes (rotation) or the viewport grows taller.
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = innerWidth;
    const widthChanged = w !== lastW;
    if (widthChanged) maxH = 0;
    const h = Math.max(maxH, innerHeight);
    if (!widthChanged && h === maxH) return;
    lastW = w;
    maxH = h;
    W = canvas.width = w * dpr;
    H = canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (!widthChanged) return; // keep existing cells, just a taller canvas
    const count = w < 700 ? 14 : 28;
    cells = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: (6 + Math.random() * 18) * dpr,
      vy: (0.15 + Math.random() * 0.4) * dpr,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      a: 0.08 + Math.random() * 0.18,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.01,
    }));
  };
  function drawCell(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.scale(1, 0.62);
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(225,29,52,${c.a})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,248,248,${c.a * 1.8})`;
    ctx.fill();
    ctx.restore();
  }
  function loop() {
    ctx.clearRect(0, 0, W, H);
    cells.forEach((c) => {
      c.y -= c.vy;
      c.x += c.vx;
      c.rot += c.vr;
      if (c.y < -c.r * 2) {
        c.y = H + c.r * 2;
        c.x = Math.random() * W;
      }
      drawCell(c);
    });
    requestAnimationFrame(loop);
  }
  resize();
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  if (!reduceMotion) loop();

  /*  Footer year  */
  $("#year").textContent = new Date().getFullYear();
})();
