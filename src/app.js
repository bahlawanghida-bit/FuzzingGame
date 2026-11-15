(function () {
const U = FL.U;
const KEY = "fuzzlab.v1";
const RANKS = [[0, "Seed"], [120, "Mutant"], [320, "Fuzzer"], [650, "Bug Hunter"], [1000, "Researcher"], [1500, "PC Member"]];
const PAPER_TAG = { core: ["Core", "var(--boot)"], fox: ["FOX", "var(--fox)"], chat: ["ChatAFL", "var(--chat)"], f4a: ["Fuzz4All", "var(--f4a)"], x: ["Compare", "var(--final)"] };

/* ---------------- persistent state (per-viewer convenience only) ---------------- */
const blank = () => ({ xp: 0, done: {}, quiz: {}, viva: {}, badges: {}, seenTerms: {}, last: null });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

const rankOf = (xp) => { let r = RANKS[0], next = null; for (let i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) { r = RANKS[i]; next = RANKS[i + 1] || null; } } return { name: r[1], base: r[0], next }; };
const toast = (msg) => { const t = U.$(document, "#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200); };
const addXP = (n, why) => {
  const before = rankOf(S.xp).name; S.xp += n; save(); drawTop();
  const after = rankOf(S.xp).name;
  toast(after !== before ? `Rank up: ${after}` : `+${n} XP${why ? " · " + why : ""}`);
};
const award = (id, name) => { if (!S.badges[id]) { S.badges[id] = Date.now(); save(); setTimeout(() => toast(`Badge unlocked: ${name}`), 900); } };

/* ---------------- top bar ---------------- */
function drawTop() {
  const r = rankOf(S.xp);
  const pct = r.next ? (S.xp - r.base) / (r.next[0] - r.base) * 100 : 100;
  U.$(document, "#rank").textContent = r.name;
  U.$(document, "#xpfill").style.width = pct + "%";
  U.$(document, "#xpnum").textContent = S.xp + " XP";
}

/* ---------------- glossary popover ---------------- */
function openTerm(id) {
  const g = FL.GLOSSARY.find(x => x.id === id); if (!g) return;
  if (!S.seenTerms[id]) { S.seenTerms[id] = 1; save(); if (Object.keys(S.seenTerms).length >= 25) award("lexicon", "Lexicon"); }
  const [tag, col] = PAPER_TAG[g.paper];
  const back = U.el(`<div class="sheet-back" role="dialog" aria-modal="true" aria-label="${U.esc(g.term)}"><div class="sheet stack">
    <div class="row" style="justify-content:space-between"><span class="tag" style="--tc:${col}">${tag}</span><button class="iconbtn" aria-label="Close">✕</button></div>
    <h3>${U.esc(g.term)}</h3><p>${U.esc(g.def)}</p>${g.ex ? `<p class="muted small"><b>Example:</b> ${U.esc(g.ex)}</p>` : ""}</div></div>`);
  const close = () => back.remove();
  back.onclick = (e) => { if (e.target === back) close(); };
  U.$(back, "button").onclick = close;
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  document.body.appendChild(back);
}
document.addEventListener("click", (e) => { const t = e.target.closest(".t[data-g]"); if (t) openTerm(t.dataset.g); });

/* ---------------- router ---------------- */
const main = () => U.$(document, "#col");
let view = { name: "home" };
function go(v, push = true) {
  view = v;
  const hash = v.name === "chapter" ? `ch-${v.id}` : v.name;
  if (push && location.hash !== "#" + hash) { try { history.replaceState(null, "", "#" + hash); } catch (e) {} }
  U.$$(document, ".nav button").forEach(b => b.setAttribute("aria-current", b.dataset.v === (v.name === "chapter" ? "home" : v.name) ? "page" : "false"));
  window.scrollTo(0, 0);
  ({ home: renderHome, chapter: renderChapter, glossary: renderGlossary, viva: renderViva, profile: renderProfile }[v.name] || renderHome)();
}
function fromHash() {
  const h = (location.hash || "").slice(1);
  if (h.startsWith("ch-")) { const id = h.slice(3); if (FL.CHAPTERS.find(c => c.id === id)) return go({ name: "chapter", id, step: S.last && S.last.ch === id ? S.last.step : 0 }, false); }
  if (["glossary", "viva", "profile"].includes(h)) return go({ name: h }, false);
  go({ name: "home" }, false);
}
window.addEventListener("hashchange", fromHash);

/* ---------------- home ---------------- */
function chProgress(ch) { const n = ch.steps.length, d = ch.steps.filter(s => S.done[s.id]).length; return { n, d }; }
function renderHome() {
  const totalSteps = FL.CHAPTERS.reduce((a, c) => a + c.steps.length, 0);
  const doneSteps = FL.CHAPTERS.reduce((a, c) => a + chProgress(c).d, 0);
  const cont = S.last && FL.CHAPTERS.find(c => c.id === S.last.ch);
  main().innerHTML = `
  <section class="hero"><canvas id="hero-cv" aria-hidden="true"></canvas>
    <div class="eyebrow" style="color:color-mix(in srgb, var(--hero-fg) 70%, transparent)">CCS'24 · NDSS'24 · ICSE'24</div>
    <h1>Fuzz Lab Chronicles</h1>
    <p>Join three research teams as they build smarter fuzzers. Break programs on purpose, run their algorithms by hand, and leave able to defend every idea in front of your examiner.</p>
    <div class="row">${cont ? `<button class="btn primary" id="cont">Continue: ${U.esc(cont.title)}</button>` : `<button class="btn primary" id="start">Start the story</button>`}<button class="btn" id="viva-go" style="background:transparent;color:var(--hero-fg);border-color:color-mix(in srgb, var(--hero-fg) 35%, transparent)">Practice the viva</button></div>
  </section>
  <div class="statrow">
    <div class="stat"><b>${doneSteps}/${totalSteps}</b><span>steps done</span></div>
    <div class="stat"><b>${Object.keys(S.viva).length}/${FL.VIVA.length}</b><span>viva questions</span></div>
    <div class="stat"><b>${Object.keys(S.badges).length}</b><span>badges</span></div>
  </div>
  <div class="eyebrow">The story</div>
  <div class="stack" id="chaps">${FL.CHAPTERS.map(c => { const p = chProgress(c); return `
    <button class="chap" data-id="${c.id}" style="--c:${c.color}">
      <span class="num">${c.num}</span>
      <span class="stack" style="gap:3px">
        <span class="venue">${U.esc(c.venue)}</span>
        <h3>${U.esc(c.title)}</h3>
        <span class="small muted">${U.esc(c.blurb)}</span>
        <span class="meter"><i style="width:${p.d / p.n * 100}%"></i></span>
        <span class="small muted">${p.d}/${p.n} steps${p.d === p.n ? " · complete" : ""}</span>
      </span>
    </button>`; }).join("")}</div>
  <div class="card flat small muted">Dialogue scenes are dramatized. Researchers' names, affiliations, numbers, methods and quotes marked with quotation marks come from the three papers. Simulations are simplified teaching models and say so where numbers are illustrative.</div>`;
  U.$$(main(), ".chap").forEach(b => b.onclick = () => { const id = b.dataset.id; const ch = FL.CHAPTERS.find(c => c.id === id); const first = ch.steps.findIndex(s => !S.done[s.id]); go({ name: "chapter", id, step: first < 0 ? 0 : first }); });
  const st = U.$(main(), "#start"); if (st) st.onclick = () => go({ name: "chapter", id: "boot", step: 0 });
  const co = U.$(main(), "#cont"); if (co) co.onclick = () => go({ name: "chapter", id: S.last.ch, step: S.last.step });
  U.$(main(), "#viva-go").onclick = () => go({ name: "viva" });
  heroAnim();
}
function heroAnim() {
  const cv = U.$(document, "#hero-cv"); if (!cv) return;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = U.canvas(cv, cv.parentElement.clientHeight || 220);
  const cols = Math.floor(ctx.W / 14), rows = Math.floor(ctx.H / 14); const cells = new Uint8Array(cols * rows);
  const paint = () => {
    ctx.clearRect(0, 0, ctx.W, ctx.H);
    for (let i = 0; i < cells.length; i++) if (cells[i]) { ctx.fillStyle = cells[i] > 200 ? "#FF7447" : "#39C9A8"; ctx.globalAlpha = Math.min(1, cells[i] / 255); ctx.fillRect((i % cols) * 14 + 2, Math.floor(i / cols) * 14 + 2, 10, 10); }
    ctx.globalAlpha = 1;
  };
  for (let k = 0; k < cells.length * 0.25; k++) cells[U.ri(0, cells.length - 1)] = U.ri(60, 180);
  paint(); if (reduce) return;
  const tick = () => {
    if (!document.body.contains(cv)) return;
    for (let k = 0; k < 6; k++) { const i = U.ri(0, cells.length - 1); cells[i] = Math.random() < 0.04 ? 255 : U.ri(70, 190); }
    for (let i = 0; i < cells.length; i++) if (cells[i] && Math.random() < 0.02) cells[i] = Math.max(0, cells[i] - 40);
    paint(); setTimeout(() => requestAnimationFrame(tick), 120);
  };
  tick();
}

/* ---------------- chapter player ---------------- */
const TYPE_LABEL = { scene: "Story", lesson: "Lesson", sim: "Hands-on", quiz: "Checkpoint" };
function renderChapter() {
  const ch = FL.CHAPTERS.find(c => c.id === view.id); let i = U.clamp(view.step || 0, 0, ch.steps.length - 1); view.step = i;
  const step = ch.steps[i];
  S.last = { ch: ch.id, step: i }; save();
  main().innerHTML = `
  <div class="chhead" style="--c:${ch.color}">
    <button class="btn sm ghost back" id="back">← ${U.esc(ch.title)}</button>
    <div class="dots" aria-label="Steps">${ch.steps.map((s, k) => `<button aria-label="Step ${k + 1}: ${U.esc(s.title)}" class="${S.done[s.id] ? "done" : ""} ${k === i ? "cur" : ""}" data-k="${k}"></button>`).join("")}</div>
    <div class="steptype">${TYPE_LABEL[step.type]} · ${i + 1}/${ch.steps.length}</div>
    <h2 class="steptitle">${U.esc(step.title)}</h2>
  </div>
  <div class="card" id="stage" style="--c:${ch.color}"></div>
  <div class="pager" style="--c:${ch.color}"><button class="btn" id="prev" ${i === 0 ? "disabled" : ""}>←</button><button class="btn primary" id="next"></button></div>`;
  U.$(main(), "#back").onclick = () => go({ name: "home" });
  U.$$(main(), ".dots button").forEach(b => b.onclick = () => go({ name: "chapter", id: ch.id, step: +b.dataset.k }));
  U.$(main(), "#prev").onclick = () => go({ name: "chapter", id: ch.id, step: i - 1 });
  const next = U.$(main(), "#next");
  const last = i === ch.steps.length - 1;
  next.textContent = last ? "Finish chapter" : "Next →";
  const markDone = (xp) => {
    if (!S.done[step.id]) { S.done[step.id] = 1; save(); addXP(xp, TYPE_LABEL[step.type]); }
  };
  next.onclick = () => {
    if (step.type === "scene" && stage._more && stage._more()) return;
    if (step.type === "scene" || step.type === "lesson") markDone(10);
    if (step.type === "sim" && !S.done[step.id]) { S.done[step.id] = 1; save(); addXP(10, "explored"); }
    if (last) {
      const p = chProgress(ch);
      if (p.d === p.n) award("ch-" + ch.id, ch.title);
      go({ name: "home" });
    } else go({ name: "chapter", id: ch.id, step: i + 1 });
  };
  const stage = U.$(main(), "#stage");
  if (step.type === "scene") renderScene(stage, step, ch);
  else if (step.type === "lesson") stage.innerHTML = `<div class="lesson">${step.html}</div>`;
  else if (step.type === "quiz") renderQuiz(stage, step, ch, () => markDone(0));
  else if (step.type === "sim") {
    stage.innerHTML = `<p class="muted" style="margin-bottom:12px">${step.intro || ""}</p><div id="simroot"></div>`;
    const api = { done: () => { if (!S.done[step.id]) { S.done[step.id] = 1; save(); addXP(30, "simulation cleared"); if (step.game === "rtspServer") award("uaf", "Use-After-Free Hunter"); if (step.game === "newtonLeap") award("newton", "Newton's Apprentice"); } }, toast };
    try { FL.GAMES[step.game](U.$(stage, "#simroot"), api); } catch (err) { U.$(stage, "#simroot").innerHTML = `<p class="small" style="color:var(--bad)">This simulation failed to load: ${U.esc(err.message)}</p>`; console.error(err); }
  }
}
function renderScene(stage, step, ch) {
  stage.innerHTML = `<div class="scene">
    ${step.setting ? `<div class="setting">${U.esc(step.setting)}</div>` : ""}
    ${step.disclaimer ? `<div class="disclaim">Dramatized scene: the dialogue is imagined, but the people, affiliations, facts and numbers come from the paper.</div>` : ""}
    <div class="stack" id="lines"></div>
    <button class="btn sm tapnext" id="more">Tap to continue ▸</button></div>`;
  const box = U.$(stage, "#lines"); let k = 0;
  const show = () => {
    const ln = step.lines[k++]; const c = FL.CAST[ln.who] || FL.CAST.narr;
    const cls = ln.who === "me" ? "me" : ln.who === "narr" ? "narr" : "";
    box.insertAdjacentHTML("beforeend", ln.who === "narr" ? `<div class="line narr"><div class="bubble">${U.esc(ln.text)}</div></div>` :
      `<div class="line ${cls}" style="--avc:${c.color}"><div class="av" aria-hidden="true">${U.esc(c.ini)}</div><div class="bubble"><div class="who">${U.esc(c.name)} <small>${U.esc(c.role)}</small></div>${U.esc(ln.text)}</div></div>`);
    if (k >= step.lines.length) U.$(stage, "#more").hidden = true;
    if (k > 2) { const el = box.lastElementChild; if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  };
  stage._more = () => { if (k < step.lines.length) { show(); return true; } return false; };
  show(); if (step.lines.length > 1) show();
  U.$(stage, "#more").onclick = show;
}
function renderQuiz(stage, step, ch, onFinish) {
  let qi = 0, score = 0;
  const draw = () => {
    if (qi >= step.qs.length) {
      const best = Math.max(S.quiz[step.id] || 0, score); S.quiz[step.id] = best; save();
      const perfect = score === step.qs.length;
      if (perfect) award("perfect-" + step.id, "Perfect: " + step.title);
      stage.innerHTML = `<div class="stack" style="align-items:flex-start"><div class="big-num">${score}/${step.qs.length}</div><p>${perfect ? "Flawless. You could teach this." : score >= step.qs.length * 0.7 ? "Solid. Review the explanations you missed and you're ready." : "Go back over the lessons for this chapter, then retake it. Repetition is how this sticks."}</p><p class="small muted">Best: ${best}/${step.qs.length}</p><button class="btn" id="retake">Retake</button></div>`;
      U.$(stage, "#retake").onclick = () => { qi = 0; score = 0; draw(); };
      if (!S.done[step.id]) { S.done[step.id] = 1; save(); addXP(20 + score * 5, "checkpoint"); }
      onFinish(); return;
    }
    const q = step.qs[qi];
    stage.innerHTML = `<div class="q"><div class="qhead"><span class="pill">Q${qi + 1}/${step.qs.length}</span><span class="pill good">score ${score}</span></div>
      <div class="prompt">${U.esc(q.q)}</div>
      <div class="stack">${q.options.map((o, k) => `<button class="opt" data-k="${k}">${U.esc(o)}</button>`).join("")}</div>
      <div id="ex"></div></div>`;
    U.$$(stage, ".opt").forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.a; if (ok) score++;
      U.$$(stage, ".opt").forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add("right"); else if (j === k) x.classList.add("wrong"); });
      U.$(stage, "#ex").innerHTML = `<div class="explain"><b>${ok ? "Correct." : "Not quite."}</b> ${U.esc(q.why)}</div><button class="btn primary" id="qn" style="margin-top:10px;width:100%">${qi + 1 < step.qs.length ? "Next question" : "See result"}</button>`;
      U.$(stage, "#qn").onclick = () => { qi++; draw(); };
    });
  };
  draw();
}

/* ---------------- glossary ---------------- */
function renderGlossary() {
  let filter = "all", q = "";
  main().innerHTML = `<h2 style="font-size:26px">Glossary</h2>
    <p class="muted">${FL.GLOSSARY.length} terms, each phrased the way you'd say it out loud. Tap any dotted word in a lesson to open its entry.</p>
    <input class="search" id="gq" type="search" placeholder="Search: frontier, Â12, autoprompting…" aria-label="Search glossary">
    <div class="chips" id="gf">${[["all", "All"], ["core", "Core"], ["fox", "FOX"], ["chat", "ChatAFL"], ["f4a", "Fuzz4All"]].map(([k, n]) => `<button class="chip ${k === "all" ? "on" : ""}" data-k="${k}">${n}</button>`).join("")}</div>
    <div class="stack" id="gl"></div>`;
  const list = () => {
    const items = FL.GLOSSARY.filter(g => (filter === "all" || g.paper === filter) && (!q || (g.term + " " + g.def).toLowerCase().includes(q)));
    U.$(main(), "#gl").innerHTML = items.map(g => { const [t, c] = PAPER_TAG[g.paper]; return `<div class="gl-item"><h4>${U.esc(g.term)} <span class="tag" style="--tc:${c}">${t}</span></h4><p class="small" style="margin-top:4px">${U.esc(g.def)}</p>${g.ex ? `<p class="small muted" style="margin-top:4px"><b>e.g.</b> ${U.esc(g.ex)}</p>` : ""}</div>`; }).join("") || `<p class="muted">No term matches "${U.esc(q)}". Try a shorter word.</p>`;
  };
  U.$(main(), "#gq").oninput = (e) => { q = e.target.value.trim().toLowerCase(); list(); };
  U.$$(main(), "#gf button").forEach(b => b.onclick = () => { filter = b.dataset.k; U.$$(main(), "#gf button").forEach(x => x.classList.toggle("on", x === b)); list(); });
  list();
}

/* ---------------- viva (oral exam drill with spaced repetition) ---------------- */
function renderViva() {
  let filter = "all", cur = null, revealed = false;
  const pool = () => FL.VIVA.map((v, i) => ({ ...v, i })).filter(v => filter === "all" || v.p === filter);
  const pickNext = () => {
    const now = Date.now(); const P = pool();
    const due = P.filter(v => !S.viva[v.i] || S.viva[v.i].due <= now);
    const from = due.length ? due : P;
    // prefer unseen, then lowest box
    from.sort((a, b) => ((S.viva[a.i] ? S.viva[a.i].box : -1) - (S.viva[b.i] ? S.viva[b.i].box : -1)) || (Math.random() - .5));
    return from[0];
  };
  main().innerHTML = `<h2 style="font-size:26px">Viva Drill</h2>
    <p class="muted">The doctor asks. Answer out loud first, then reveal the model answer and grade yourself honestly. Missed questions come back sooner.</p>
    <div class="chips" id="vf">${[["all", "All"], ["core", "Core"], ["fox", "FOX"], ["chat", "ChatAFL"], ["f4a", "Fuzz4All"], ["x", "Compare"]].map(([k, n]) => `<button class="chip ${k === "all" ? "on" : ""}" data-k="${k}">${n}</button>`).join("")}</div>
    <div class="card viva-card" id="vc"></div>
    <div class="small muted" id="vstat"></div>`;
  const stat = () => {
    const P = pool(); const m = P.filter(v => S.viva[v.i] && S.viva[v.i].box >= 2).length;
    U.$(main(), "#vstat").textContent = `Mastered ${m}/${P.length} in this set · answered ${Object.keys(S.viva).length}/${FL.VIVA.length} overall`;
  };
  const draw = () => {
    cur = pickNext(); revealed = false; if (!cur) return;
    const [tag, col] = PAPER_TAG[cur.p];
    const lvl = ["", "Recall", "Explain", "Critique"][cur.l];
    U.$(main(), "#vc").innerHTML = `<div class="doctor"><div class="av" style="--avc:var(--final)">Dr</div><div><b>The Doctor asks</b><div class="row" style="gap:6px;margin-top:2px"><span class="tag" style="--tc:${col}">${tag}</span><span class="pill">${lvl}</span></div></div></div>
      <div class="viva-q">${U.esc(cur.q)}</div>
      <button class="btn primary" id="rev">Reveal model answer</button>
      <div class="answer" id="ans" hidden>
        <p>${U.esc(cur.a)}</p>
        <div><div class="eyebrow" style="margin-bottom:4px">Key points to hit</div><div class="chips">${cur.k.map(k => `<span class="pill">${U.esc(k)}</span>`).join("")}</div></div>
        <div class="eyebrow">How did you do?</div>
        <div class="grid2" style="grid-template-columns:repeat(3,1fr)"><button class="btn" data-g="0">Missed</button><button class="btn" data-g="1">Partly</button><button class="btn primary" data-g="2">Nailed it</button></div>
      </div>`;
    U.$(main(), "#rev").onclick = () => { U.$(main(), "#ans").hidden = false; U.$(main(), "#rev").hidden = true; };
    U.$$(main(), "#ans [data-g]").forEach(b => b.onclick = () => {
      const g = +b.dataset.g; const prev = S.viva[cur.i] || { box: 0, due: 0 };
      const box = g === 2 ? Math.min(prev.box + 1, 4) : g === 1 ? Math.max(prev.box, 1) : 0;
      const wait = [1, 5, 30, 240, 1440][box] * 60000 * (g === 0 ? 0.2 : 1);
      const first = !S.viva[cur.i];
      S.viva[cur.i] = { box, due: Date.now() + wait }; save();
      if (first) addXP(g === 2 ? 12 : g === 1 ? 8 : 4, "viva");
      if (Object.keys(S.viva).length >= 20) award("viva20", "Viva Veteran");
      if (Object.values(S.viva).filter(v => v.box >= 2).length >= 30) award("viva-master", "Defense Ready");
      stat(); draw();
    });
  };
  U.$$(main(), "#vf button").forEach(b => b.onclick = () => { filter = b.dataset.k; U.$$(main(), "#vf button").forEach(x => x.classList.toggle("on", x === b)); stat(); draw(); });
  stat(); draw();
}

/* ---------------- profile ---------------- */
function renderProfile() {
  const B = [["ch-boot", "Bootcamp", "Finish the prologue"], ["ch-fox", "FOX: The Control Room", "Finish chapter 1"], ["ch-chat", "ChatAFL: The Protocol Whisperer", "Finish chapter 2"], ["ch-f4a", "Fuzz4All: One Fuzzer, Every Language", "Finish chapter 3"], ["ch-final", "Defense Day", "Finish the finale"],
    ["newton", "Newton's Apprentice", "Flip a branch with Newton's method"], ["uaf", "Use-After-Free Hunter", "Reproduce ChatAFL bug #1"], ["lexicon", "Lexicon", "Open 25 glossary terms"], ["viva20", "Viva Veteran", "Answer 20 viva questions"], ["viva-master", "Defense Ready", "Master 30 viva questions"]];
  const r = rankOf(S.xp);
  main().innerHTML = `<h2 style="font-size:26px">Your lab notebook</h2>
    <div class="card"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">Rank</div><div class="big-num">${r.name}</div></div><div style="text-align:right"><div class="eyebrow">Experience</div><div class="big-num">${S.xp}</div></div></div>
    <div class="meterbar" style="margin-top:10px"><i style="width:${r.next ? (S.xp - r.base) / (r.next[0] - r.base) * 100 : 100}%"></i></div>
    <p class="small muted" style="margin-top:6px">${r.next ? `${r.next[0] - S.xp} XP to ${r.next[1]}` : "Top rank reached."} Ranks: ${RANKS.map(x => x[1]).join(" → ")}</p></div>
    <div class="eyebrow">Badges</div>
    <div class="badge-grid">${B.map(([id, n, d]) => `<div class="badge ${S.badges[id] ? "got" : ""}"><div class="ic">${S.badges[id] ? "★" : "?"}</div><b>${n}</b><span>${d}</span></div>`).join("")}</div>
    <div class="eyebrow">Checkpoint scores</div>
    <div class="card flat"><table class="data">${FL.CHAPTERS.flatMap(c => c.steps.filter(s => s.type === "quiz").map(s => `<tr><td>${U.esc(s.title)}</td><td class="num">${S.quiz[s.id] !== undefined ? S.quiz[s.id] + "/" + s.qs.length : "not taken"}</td></tr>`)).join("")}</table></div>
    <div class="eyebrow">Papers</div>
    <div class="stack small">${FL.CHAPTERS.filter(c => c.paper).map(c => `<div class="card flat" style="border-left:5px solid ${c.color}">${U.esc(c.paper)}</div>`).join("")}</div>
    <div class="row"><button class="btn sm" id="theme">Theme: <span id="thv"></span></button><button class="btn sm ghost" id="reset">Reset progress</button></div>
    <div id="confirm"></div>`;
  const th = () => U.$(main(), "#thv").textContent = document.documentElement.dataset.theme || "system";
  th();
  U.$(main(), "#theme").onclick = () => { const cur = document.documentElement.dataset.theme; const nx = !cur ? "dark" : cur === "dark" ? "light" : ""; if (nx) document.documentElement.dataset.theme = nx; else delete document.documentElement.dataset.theme; try { localStorage.setItem(KEY + ".theme", nx); } catch (e) {} th(); };
  U.$(main(), "#reset").onclick = () => {
    U.$(main(), "#confirm").innerHTML = `<div class="callout trap"><p>This erases XP, badges, quiz scores and viva history on this device.</p><div class="row" style="margin-top:8px"><button class="btn sm" id="rk">Keep my progress</button><button class="btn sm primary" id="ry">Erase progress</button></div></div>`;
    U.$(main(), "#rk").onclick = () => U.$(main(), "#confirm").innerHTML = "";
    U.$(main(), "#ry").onclick = () => { S = blank(); save(); drawTop(); toast("Progress erased"); renderProfile(); };
  };
}

/* ---------------- boot ---------------- */
try { const t = localStorage.getItem(KEY + ".theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
U.$$(document, ".nav button").forEach(b => b.onclick = () => go({ name: b.dataset.v }));
U.$(document, "#homebtn").onclick = () => go({ name: "home" });
drawTop();
const start = () => fromHash();
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start();
})();
