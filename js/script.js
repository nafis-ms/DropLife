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

  /*  Mobile menu  */
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  const toggleMenu = (force) => {
    const open = force ?? !navLinks.classList.contains("open");
    navLinks.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
  };
  burger.addEventListener("click", () => toggleMenu());
  $$("a", navLinks).forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false)),
  );

  /*  Scroll spy  */
  const sections = $$("main section[id]");
  const links = $$("a", navLinks);
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
  GROUPS.forEach((g) => {
    const b = document.createElement("button");
    b.className = "group-btn";
    b.type = "button";
    b.textContent = g;
    b.addEventListener("click", () => {
      $$(".group-btn", picker).forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      result.style.opacity = 0;
      setTimeout(() => {
        result.innerHTML = `<strong>${g}</strong> can donate to: ${CAN_DONATE_TO[g].join(", ")}`;
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

  /*  Particles: floating blood cells  */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let W,
    H,
    cells = [];
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * dpr;
    H = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    const count = innerWidth < 700 ? 14 : 28;
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
  window.addEventListener("resize", resize);
  if (!reduceMotion) loop();

  /*  Footer year  */
  $("#year").textContent = new Date().getFullYear();
})();
