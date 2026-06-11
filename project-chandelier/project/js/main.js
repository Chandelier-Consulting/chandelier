/* ============================================================
   CHANDELIER CONSULTING — motion engine v3
   Native scroll · sticky pins · scroll-scrubbed scenes
   (no scroll hijack — robust under rAF throttling)
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mqDesktop = window.matchMedia("(min-width: 901px)");
  const scenesActive = () => mqDesktop.matches && !reduce;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- 1. SPLIT HEADINGS into masked lines ---------- */
  document.querySelectorAll(".reveal-lines").forEach((el) => {
    const segments = el.innerHTML.split(/<br[^>]*>/i);
    el.innerHTML = segments
      .map(
        (seg, i) =>
          `<span class="line-mask"><span class="line-inner" style="transition-delay:${(i * 0.09).toFixed(2)}s">${seg.trim()}</span></span>`
      )
      .join("");
  });
  document.querySelectorAll(".stat .num").forEach((num) => {
    num.innerHTML = `<span class="num-roll">${num.innerHTML}</span>`;
  });
  document.querySelectorAll(".stats-grid").forEach((grid) => {
    [...grid.children].forEach((card, i) => { card.style.transitionDelay = `${(i % 4) * 0.09}s`; });
  });

  /* ---------- 2. NAV + DRAWER ---------- */
  const nav = document.querySelector(".nav");
  const burger = document.querySelector(".burger");
  const drawer = document.querySelector(".drawer");
  const toggleDrawer = (force) => {
    const open = force !== undefined ? force : !drawer.classList.contains("open");
    drawer.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleDrawer());
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggleDrawer(false)));

  /* ---------- 3. REVEALS + COUNTERS ---------- */
  const revealEls = [...document.querySelectorAll(".reveal, .reveal-lines, .reveal-card")];
  const counters = [...document.querySelectorAll("[data-count]")];
  const countDone = new WeakSet();

  function animateCount(el) {
    if (countDone.has(el)) return;
    countDone.add(el);
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const dur = 1700, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = (target * easeOutCubic(p)).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    };
    requestAnimationFrame(step);
  }

  function updateReveals() {
    const vh = window.innerHeight;
    for (let i = revealEls.length - 1; i >= 0; i--) {
      const el = revealEls[i];
      if (el.getBoundingClientRect().top < vh * 0.9) {
        el.classList.add("in");
        revealEls.splice(i, 1);
        el.querySelectorAll("[data-count]").forEach(animateCount);
      }
    }
    for (let i = counters.length - 1; i >= 0; i--) {
      const t = counters[i].getBoundingClientRect().top;
      if (t < vh * 0.85 && t > -240) { animateCount(counters[i]); counters.splice(i, 1); }
    }
  }

  /* ---------- 4. PARALLAX ---------- */
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  function updateParallax() {
    if (reduce) return;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax);
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  }

  /* ---------- 5. SCROLL-SCRUBBED SCENES (sticky) ---------- */
  const sceneUpdaters = [];

  function setupServicesScene() {
    const track = document.querySelector(".svc-track");
    if (!track) return;
    const cards = [...track.querySelectorAll("[data-card]")];
    const bar = track.querySelector(".svc-progress span");
    let wasActive = null;
    sceneUpdaters.push(() => {
      if (!scenesActive()) {
        if (wasActive !== false) {
          cards.forEach((c) => { c.style.opacity = "1"; c.style.transform = "none"; });
          if (bar) bar.style.transform = "scaleX(0)";
          wasActive = false;
        }
        return;
      }
      wasActive = true;
      const len = track.offsetHeight - window.innerHeight;
      if (len <= 0) return;
      const progress = clamp(-track.getBoundingClientRect().top / len, 0, 1);
      if (bar) bar.style.transform = `scaleX(${progress.toFixed(3)})`;
      cards.forEach((card, i) => {
        const bs = 0.06 + i * 0.27, be = bs + 0.36;
        const e = easeOutCubic(clamp((progress - bs) / (be - bs), 0, 1));
        const ty = (1 - e) * 170, rot = (1 - e) * (i - 1) * 6, sc = 0.9 + 0.1 * e;
        card.style.opacity = e.toFixed(3);
        card.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      });
    });
  }

  function setupClientsScene() {
    const track = document.querySelector(".cl-track");
    if (!track) return;
    const row = track.querySelector(".cl-row");
    const rail = track.querySelector(".cl-rail");
    const bar = track.querySelector(".cl-progress span");
    let wasActive = null;
    sceneUpdaters.push(() => {
      if (!scenesActive()) {
        if (wasActive !== false) {
          row.style.transform = "none";       // let cards sit in normal flow
          rail.style.overflowX = "auto";        // keep ALL cards reachable via swipe/scroll
          if (bar) bar.style.transform = "scaleX(0)";
          wasActive = false;
        }
        return;
      }
      if (wasActive !== true) {
        rail.style.overflowX = "";              // hand overflow back to CSS (hidden)
        wasActive = true;
      }
      const len = track.offsetHeight - window.innerHeight;
      if (len <= 0) return;
      const progress = clamp(-track.getBoundingClientRect().top / len, 0, 1);
      const maxX = Math.max(0, row.scrollWidth - rail.clientWidth + 24);
      row.style.transform = `translate3d(${(-easeInOut(progress) * maxX).toFixed(1)}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${progress.toFixed(3)})`;
    });
  }

  // Always register — the updaters self-enable/disable per frame via
  // scenesActive(), so a narrow-then-widened preview pane can't latch them off.
  setupServicesScene();
  setupClientsScene();

  if (reduce) {
    revealEls.forEach((el) => el.classList.add("in"));
    counters.forEach((c) => (c.textContent = parseFloat(c.dataset.count).toFixed((c.dataset.count.split(".")[1] || "").length)));
  }

  /* ---------- 6. RENDER LOOP (scroll + rAF, throttle-proof) ---------- */
  function render() {
    updateParallax();
    for (let i = 0; i < sceneUpdaters.length; i++) sceneUpdaters[i]();
    updateReveals();
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }

  // scroll fires at frame-rate during user scroll even when rAF is throttled
  window.addEventListener("scroll", render, { passive: true });
  window.addEventListener("resize", render, { passive: true });
  // persistent rAF for buttery scrub while focused
  (function loop() { render(); requestAnimationFrame(loop); })();
  render();
  // failsafe: nothing stays hidden
  if (!reduce) setTimeout(() => revealEls.forEach((el) => el.classList.add("in")), 3000);

  /* ---------- 7. CARD CURSOR GLOW + MAGNETIC ---------- */
  document.querySelectorAll(".svc").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
  if (!coarse && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.3}px, ${(e.clientY - (r.top + r.height / 2)) * 0.3}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- 8. CONTACT FORM (mock) + year ---------- */
  const form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "Sending\u2026";
      setTimeout(() => {
        btn.innerHTML = "Received \u2726 We'll be in touch";
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; form.reset(); }, 2600);
      }, 700);
    });
  }
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
