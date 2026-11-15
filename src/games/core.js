window.FL = window.FL || {};
FL.GAMES = FL.GAMES || {};

/* ---------- tiny utilities shared by all games ---------- */
FL.U = {
  el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  $(root, sel) { return root.querySelector(sel); },
  $$(root, sel) { return Array.from(root.querySelectorAll(sel)); },
  rand: Math.random,
  ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
  fmt(n) { return Number(n).toLocaleString("en-US"); },
  pct(a, b) { return ((a / b - 1) * 100); },
  // seeded RNG (mulberry32) so simulations can replay identical worlds
  rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"; },
  // set up a canvas for crisp drawing; returns ctx with logical size w x h
  canvas(cv, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(240, cv.clientWidth || cv.parentElement.clientWidth || 320);
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + "px";
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.W = w; ctx.H = h; return ctx;
  },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
};
