(function () {
const U = FL.U, G = FL.GAMES;

/* =====================================================================
   BOOTCAMP · Mutation Lab
   ===================================================================== */
G.mutationLab = function (root, api) {
  const SEED = "FUZZ", TARGET = "BUG!";
  root.innerHTML = `
  <div class="sim">
    <div class="codeblock"><span class="k">int</span> parse(<span class="k">char</span> *buf) {
  <span class="k">if</span> (buf[0] == <span class="s">'B'</span>)        <span class="c">// edge e1</span>
    <span class="k">if</span> (buf[1] == <span class="s">'U'</span>)      <span class="c">// edge e2</span>
      <span class="k">if</span> (buf[2] == <span class="s">'G'</span>)    <span class="c">// edge e3</span>
        <span class="k">if</span> (buf[3] == <span class="s">'!'</span>)  <span class="c">// edge e4</span>
          crash();          <span class="c">// heap overflow!</span>
  <span class="k">return</span> 0;
}</div>
    <div class="panel stack">
      <div class="eyebrow">Current input</div>
      <div class="bytes" id="ml-bytes"></div>
      <div class="row">
        <button class="btn sm" id="ml-bit">Flip a random bit</button>
        <button class="btn sm" id="ml-byte">Random byte</button>
        <button class="btn sm" id="ml-havoc">Havoc (stack 3)</button>
        <button class="btn sm ghost" id="ml-reset">Reset to seed</button>
      </div>
      <div class="small muted" id="ml-manual">Each tap mutates the input and runs it once. Byte values are random over all 256 values, as in a real fuzzer.</div>
    </div>
    <div class="panel">
      <div class="eyebrow" style="margin-bottom:8px">Edge coverage (bitmap)</div>
      <div class="row" id="ml-cov"></div>
    </div>
    <div class="stack">
      <div class="eyebrow">Automatic fuzzing · 40,000 executions</div>
      <div class="grid2">
        <button class="btn" id="ml-blind">Blind run</button>
        <button class="btn primary" id="ml-guided">Coverage-guided run</button>
      </div>
      <div class="kv panel"><span>Executions</span><b id="ml-execs">0</b><span>Corpus size</span><b id="ml-corp">1 (seed)</b><span>Deepest edge</span><b id="ml-deep">none</b></div>
      <div class="log" id="ml-log"><span class="dim">Seed corpus: "FUZZ"</span></div>
    </div>
  </div>`;
  let cur = SEED.split("").map(c => c.charCodeAt(0));
  const covSeen = new Set();
  const show = (bytes, changed = []) => {
    U.$(root, "#ml-bytes").innerHTML = bytes.map((b, i) => {
      const ch = b >= 32 && b < 127 ? U.esc(String.fromCharCode(b)) : "\\x" + b.toString(16).padStart(2, "0");
      const ok = b === TARGET.charCodeAt(i) && depth(bytes) > i;
      return `<span class="${changed.includes(i) ? "chg" : ""} ${ok ? "ok" : ""}">${ch}</span>`;
    }).join("");
  };
  const depth = (b) => { let d = 0; while (d < 4 && b[d] === TARGET.charCodeAt(d)) d++; return d; };
  const drawCov = (set) => {
    U.$(root, "#ml-cov").innerHTML = ["e1", "e2", "e3", "e4"].map((e, i) =>
      `<span class="pill ${set.has(i + 1) ? "good" : ""}">${e} ${set.has(i + 1) ? "■" : "□"}</span>`).join("") +
      (set.has(4) ? `<span class="pill bad">CRASH</span>` : "");
  };
  const mutate = (bytes, kind) => {
    const b = bytes.slice(), changed = [];
    const one = () => {
      const i = U.ri(0, b.length - 1); changed.push(i);
      if (kind === "bit") b[i] ^= 1 << U.ri(0, 7); else b[i] = U.ri(0, 255);
    };
    if (kind === "havoc") { const n = U.ri(1, 3); for (let k = 0; k < n; k++) { kind = U.pick(["bit", "byte"]); one(); } }
    else one();
    return { b, changed };
  };
  const manual = (kind) => {
    const { b, changed } = mutate(cur, kind); cur = b;
    const d = depth(cur); for (let i = 1; i <= d; i++) covSeen.add(i);
    show(cur, changed); drawCov(covSeen);
    U.$(root, "#ml-manual").textContent = d === 4 ? "You crashed it by hand. Lucky!" : `Ran once: reached ${d ? "e" + d : "no new edge"}. Doing this by hand doesn't scale, so try the automatic runs below.`;
    if (d === 4) api.done();
  };
  U.$(root, "#ml-bit").onclick = () => manual("bit");
  U.$(root, "#ml-byte").onclick = () => manual("byte");
  U.$(root, "#ml-havoc").onclick = () => manual("havoc");
  U.$(root, "#ml-reset").onclick = () => { cur = SEED.split("").map(c => c.charCodeAt(0)); show(cur); };
  show(cur); drawCov(covSeen);

  let running = false;
  const run = (guided) => {
    if (running) return; running = true;
    const log = U.$(root, "#ml-log"); log.innerHTML = "";
    const seed = SEED.split("").map(c => c.charCodeAt(0));
    const corpus = [seed]; const cov = new Set(); let execs = 0, rr = 0, found = false, best = 0;
    const L = (html) => { log.insertAdjacentHTML("beforeend", html + "\n"); log.scrollTop = log.scrollHeight; };
    L(`<span class="dim">${guided ? "Coverage-guided" : "Blind"} campaign started. Seed "FUZZ".</span>`);
    const step = () => {
      for (let k = 0; k < 500 && execs < 40000 && !found; k++) {
        const parent = guided ? corpus[rr++ % corpus.length] : seed;
        const { b } = mutate(parent, "havoc"); execs++;
        const d = depth(b);
        let isNew = false; for (let i = 1; i <= d; i++) if (!cov.has(i)) { cov.add(i); isNew = true; }
        if (d > best) best = d;
        if (d === 4) { found = true; L(`<span class="bad">exec ${U.fmt(execs)}: CRASH with "${String.fromCharCode(...b)}". Saved to crashes/.</span>`); show(b); }
        else if (isNew && guided) { corpus.push(b); L(`<span class="good">exec ${U.fmt(execs)}: new edge e${d}, kept "${b.map(x => x >= 32 && x < 127 ? String.fromCharCode(x) : "·").join("")}"</span>`); }
      }
      U.$(root, "#ml-execs").textContent = U.fmt(execs);
      U.$(root, "#ml-corp").textContent = guided ? corpus.length : "1 (never grows)";
      U.$(root, "#ml-deep").textContent = best ? "e" + best : "none";
      drawCov(cov);
      if (!found && execs < 40000) requestAnimationFrame(step);
      else {
        running = false;
        if (!found) L(`<span class="warn">Budget spent. No crash. Blind fuzzing must guess all 4 bytes at once: about 1 in 256⁴ ≈ 4.3 billion.</span>`);
        else if (guided) { L(`<span class="good">Each correct byte was rewarded and kept, so the fuzzer only had to guess one byte at a time (about 1 in 1,024 per step).</span>`); api.done(); }
      }
    };
    requestAnimationFrame(step);
  };
  U.$(root, "#ml-blind").onclick = () => run(false);
  U.$(root, "#ml-guided").onclick = () => run(true);
};

/* =====================================================================
   FOX · Frontier Finder
   ===================================================================== */
G.frontierFinder = function (root, api) {
  const LEVELS = [
    { name: "if / else", nodes: { A: [150, 30], B: [80, 120], C: [220, 120], D: [40, 220], E: [130, 220], F: [220, 220] },
      edges: [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"]], visited: ["A", "B", "C", "D"] },
    { name: "diamond + join", nodes: { A: [150, 25], B: [150, 95], C: [80, 165], D: [220, 165], E: [150, 235], F: [80, 305], G: [220, 305], H: [150, 370] },
      edges: [["A", "B"], ["B", "C"], ["B", "D"], ["C", "E"], ["D", "E"], ["E", "F"], ["E", "G"], ["F", "H"], ["G", "H"]], visited: ["A", "B", "C", "E", "F", "H"] },
    { name: "a real-looking parser", nodes: { A: [150, 22], B: [70, 90], C: [230, 90], D: [30, 165], E: [110, 165], F: [190, 165], G: [270, 165], H: [70, 245], I: [150, 245], J: [230, 245], K: [110, 320], L: [190, 320] },
      edges: [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "F"], ["C", "G"], ["E", "H"], ["E", "I"], ["F", "I"], ["F", "J"], ["H", "K"], ["I", "K"], ["I", "L"], ["J", "L"]],
      visited: ["A", "B", "C", "D", "E", "F", "I", "K"] }
  ];
  let lv = 0, found = new Set();
  root.innerHTML = `<div class="sim">
    <div class="row"><span class="pill" id="ff-lv"></span><span class="pill" id="ff-cnt"></span></div>
    <div class="legend"><span><i style="background:var(--ink)"></i>visited (V)</span><span><i style="border:2px solid var(--muted);background:transparent"></i>unvisited (U)</span><span><i style="background:var(--fox)"></i>frontier you found</span></div>
    <svg id="ff-svg" viewBox="0 0 300 400" style="max-height:440px"></svg>
    <div class="panel small" id="ff-msg">Tap a node.</div>
    <div class="row"><button class="btn sm" id="ff-hint">Hint</button><button class="btn sm primary" id="ff-next" hidden>Next level</button></div>
  </div>`;
  const svg = U.$(root, "#ff-svg");
  const frontier = (L) => {
    const V = new Set(L.visited);
    return new Set(L.edges.filter(([a, b]) => V.has(a) && !V.has(b)).map(([a]) => a));
  };
  const draw = () => {
    const L = LEVELS[lv], V = new Set(L.visited), F = frontier(L);
    let s = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>`;
    L.edges.forEach(([a, b]) => {
      const [x1, y1] = L.nodes[a], [x2, y2] = L.nodes[b];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const taken = V.has(a) && V.has(b);
      s += `<line x1="${x1 + ux * 17}" y1="${y1 + uy * 17}" x2="${x2 - ux * 19}" y2="${y2 - uy * 19}" stroke="${taken ? "var(--ink)" : "var(--muted)"}" stroke-width="${taken ? 2.2 : 1.4}" stroke-dasharray="${taken ? "" : "4 4"}" marker-end="url(#ar)"/>`;
    });
    Object.entries(L.nodes).forEach(([n, [x, y]]) => {
      const v = V.has(n), f = found.has(n);
      s += `<g data-n="${n}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="22" fill="transparent"/>
        <circle cx="${x}" cy="${y}" r="16" fill="${f ? "var(--fox)" : v ? "var(--ink)" : "var(--paper)"}" stroke="${v ? "var(--ink)" : "var(--muted)"}" stroke-width="2"/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="var(--f-mono)" font-size="14" font-weight="700" fill="${v || f ? "var(--paper)" : "var(--muted)"}">${n}</text></g>`;
    });
    svg.innerHTML = s;
    U.$(root, "#ff-lv").textContent = `Level ${lv + 1}/3 · ${L.name}`;
    U.$(root, "#ff-cnt").textContent = `${found.size}/${F.size} frontier nodes`;
    U.$$(svg, "g[data-n]").forEach(g => g.onclick = () => tap(g.dataset.n));
  };
  const tap = (n) => {
    const L = LEVELS[lv], V = new Set(L.visited), F = frontier(L), msg = U.$(root, "#ff-msg");
    if (found.has(n)) return;
    if (F.has(n)) {
      found.add(n);
      const outs = L.edges.filter(([a, b]) => a === n && !V.has(b)).map(e => e[1]);
      msg.innerHTML = `<b>${n} is a frontier node.</b> It is visited and has an edge into unvisited ${outs.join(", ")}. Its conditional jump is a frontier branch: flip it and you gain new coverage.`;
    } else if (!V.has(n)) {
      const fromV = L.edges.some(([a, b]) => b === n && V.has(a));
      msg.innerHTML = fromV ? `<b>${n} is unvisited.</b> It sits on the boundary, which makes it a <em>horizon node</em> in K-Scheduler's terms. FOX's frontier is the <em>visited</em> parent that leads here.` :
        `<b>${n} is unvisited and deep in unexplored code.</b> FOX can't measure a branch distance for it, because its comparison never executes.`;
    } else {
      msg.innerHTML = `<b>${n} is visited, but every outgoing edge already leads to visited code.</b> It's fully explored, so FOX's adaptive switch turns its hook off.`;
    }
    draw();
    if (found.size === F.size) {
      if (lv < LEVELS.length - 1) { U.$(root, "#ff-next").hidden = false; msg.innerHTML += `<br><b>Level cleared.</b>`; }
      else { msg.innerHTML += `<br><b>All levels cleared.</b> Notice how small the frontier is compared with the whole graph. That's why FOX's control space stays compact.`; api.done(); }
    }
  };
  U.$(root, "#ff-next").onclick = () => { lv++; found = new Set(); U.$(root, "#ff-next").hidden = true; U.$(root, "#ff-msg").textContent = "Tap a node."; draw(); };
  U.$(root, "#ff-hint").onclick = () => { U.$(root, "#ff-msg").innerHTML = `Rule: F = { v | (v,u) ∈ E, v ∈ V, u ∈ U }. Look for a <b>filled</b> node with a <b>dashed</b> arrow leaving it.`; };
  draw();
};

/* =====================================================================
   FOX · Branch Distance Dial
   ===================================================================== */
G.branchDial = function (root, api) {
  const BR = [
    { code: "if (x <= 15)", c: 15, R: "≤", x0: 5 },
    { code: "if (x == 42)", c: 42, R: "=", x0: 200 },
    { code: "if (x > 200)", c: 200, R: ">", x0: 50 },
    { code: "if (x != 7)", c: 7, R: "≠", x0: 7 },
    { code: "if (x < 100)", c: 100, R: "<", x0: 150 }
  ];
  const holds = (R, f) => ({ "<": f < 0, "≤": f <= 0, ">": f > 0, "≥": f >= 0, "=": f === 0, "≠": f !== 0 })[R];
  // Table 1 exactly as printed in the paper
  const table1 = (Q, R) => {
    const key = (Q ? "T" : "F") + R;
    const map = { "F<": ["f(x) − 1", f => f - 1], "T≥": ["f(x) − 1", f => f - 1], "F≤": ["f(x)", f => f], "T>": ["f(x)", f => f],
      "F>": ["1 − f(x)", f => 1 - f], "T≤": ["1 − f(x)", f => 1 - f], "F≥": ["−f(x)", f => -f], "T<": ["−f(x)", f => -f],
      "F=": ["|f(x)|", f => Math.abs(f)], "T≠": ["|f(x)|", f => Math.abs(f)], "F≠": ["1 − |f(x)|", f => 1 - Math.abs(f)], "T=": ["1 − |f(x)|", f => 1 - Math.abs(f)] };
    return map[key];
  };
  let bi = 0, x = BR[0].x0; const flipped = new Set();
  root.innerHTML = `<div class="sim">
    <div class="chips" id="bd-chips"></div>
    <div class="codeblock" id="bd-code"></div>
    <canvas id="bd-cv"></canvas>
    <label class="small muted" for="bd-x">Input x</label>
    <input type="range" id="bd-x" min="0" max="255" step="1">
    <div class="kv panel" id="bd-kv"></div>
    <div class="panel small" id="bd-msg"></div>
    <div class="small muted" id="bd-prog"></div>
  </div>`;
  const chips = U.$(root, "#bd-chips");
  chips.innerHTML = BR.map((b, i) => `<button class="chip" data-i="${i}">${U.esc(b.code)}</button>`).join("");
  U.$$(chips, "button").forEach(bt => bt.onclick = () => { bi = +bt.dataset.i; x = BR[bi].x0; U.$(root, "#bd-x").value = x; render(); });
  const slider = U.$(root, "#bd-x");
  slider.oninput = () => { x = +slider.value; render(); };
  const render = () => {
    const b = BR[bi], f = x - b.c, Q0 = holds(b.R, b.x0 - b.c), Q = holds(b.R, f);
    const [name, fn] = table1(Q0, b.R), d = fn(f), flip = Q !== Q0;
    if (flip) flipped.add(bi);
    U.$$(chips, "button").forEach((bt, i) => bt.classList.toggle("on", i === bi));
    U.$(root, "#bd-code").innerHTML = `<span class="k">${U.esc(b.code)}</span>    <span class="c">// f(x) = x − ${b.c},  R = ${b.R}</span>\n<span class="c">// reaching seed: x = ${b.x0}, so Q₀ = ${Q0}</span>`;
    slider.value = x;
    U.$(root, "#bd-kv").innerHTML = `<span>x</span><b>${x}</b><span>f(x)</span><b>${f}</b><span>Q now</span><b>${Q}</b><span>Table 1 row</span><b>(${Q0}, ${b.R}) → δ = ${name}</b><span>δ(x)</span><b style="color:${d <= 0 ? "var(--cov)" : "var(--ink)"}">${d}</b><span>Branch</span><b style="color:${flip ? "var(--cov)" : "var(--muted)"}">${flip ? "FLIPPED: new edge!" : "not flipped"}</b>`;
    let msg = flip ? `Flipped. The other outgoing edge executes, which is new coverage.` : `Drag x so that δ falls to 0. Lower δ means closer to flipping.`;
    if (b.R === "<" && !flip && d <= 0) msg = `δ = ${d} but the branch has <b>not</b> flipped. The printed row says δ = f(x) − 1, which reaches 0 at x = 101, while x &lt; 100 needs x ≤ 99. With f(x) + 1 the root would be exactly x = 99, consistent with the other five rows. It looks like a typo in the table, and spotting it is a good viva point.`;
    if (b.R === "<" && flip) msg = `Flipped at x = ${x}. Note that δ = ${d} here, not 0. The printed formula f(x) − 1 is off by 2 for this row (f(x) + 1 would give 0 at x = 99).`;
    U.$(root, "#bd-msg").innerHTML = msg;
    U.$(root, "#bd-prog").textContent = `Branches flipped: ${flipped.size}/5`;
    if (flipped.size >= 3) api.done();
    // plot
    const cv = U.$(root, "#bd-cv"), ctx = U.canvas(cv, 170), W = ctx.W, H = ctx.H, pad = 28;
    const vals = []; for (let t = 0; t <= 255; t++) vals.push(fn(t - b.c));
    const lo = Math.min(-5, ...vals), hi = Math.max(5, ...vals);
    const X = t => pad + (t / 255) * (W - pad - 8), Y = v => 10 + (1 - (v - lo) / (hi - lo)) * (H - 30);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = U.css("--line"); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, Y(0)); ctx.lineTo(W - 8, Y(0)); ctx.stroke();
    ctx.fillStyle = U.css("--muted"); ctx.font = "11px " + U.css("--f-mono"); ctx.fillText("δ=0", 2, Y(0) + 4); ctx.fillText("0", pad - 4, H - 4); ctx.fillText("255", W - 30, H - 4);
    // flipped region shading
    ctx.fillStyle = U.css("--cov") + "22";
    for (let t = 0; t <= 255; t++) if (holds(b.R, t - b.c) !== Q0) ctx.fillRect(X(t) - 0.6, 10, (W - pad - 8) / 255 + 1.2, H - 30);
    ctx.strokeStyle = U.css("--fox"); ctx.lineWidth = 2; ctx.beginPath();
    vals.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
    ctx.fillStyle = U.css("--ink"); ctx.beginPath(); ctx.arc(X(x), Y(d), 5, 0, 7); ctx.fill();
  };
  render();
  window.addEventListener("resize", render, { passive: true });
};

/* =====================================================================
   FOX · Scheduler Showdown
   ===================================================================== */
G.schedulerShowdown = function (root, api) {
  const BUDGET = 60;
  let patho = false, world, manual;
  root.innerHTML = `<div class="sim">
    <div class="row"><span class="pill" id="ss-time"></span><span class="pill good" id="ss-flips"></span>
      <label class="small row" style="gap:6px"><input type="checkbox" id="ss-patho"> include a pathological branch</label></div>
    <div class="scrollx"><table class="data" id="ss-tab"></table></div>
    <div class="small muted">Tap <b>Schedule</b> on a branch to spend its seed's execution time on a local-search round. Score is FOX's log PT − log TT − log SC. Higher means more promising.</div>
    <div class="log" id="ss-log"></div>
    <div class="row"><button class="btn sm" id="ss-auto">Let FOX pick this stage</button><button class="btn sm ghost" id="ss-new">New world</button></div>
    <div class="panel" id="ss-result" hidden></div>
  </div>`;
  const mkWorld = (seed) => {
    const r = U.rng(seed);
    const mk = (id) => ({ id, p: [0.06, 0.15, 0.3, 0.5, 0.75][Math.floor(r() * 5)], need: 2 + Math.floor(r() * 4), t: 1 + Math.floor(r() * 3), gain: 3 + Math.floor(r() * 12), seed: Math.floor(r() * 1e9) });
    const bs = []; for (let i = 0; i < 5; i++) bs.push(mk("B" + (i + 1)));
    const spares = []; for (let i = 0; i < 30; i++) spares.push(mk("B" + (i + 6)));
    if (patho) { bs[4] = { id: "B5", p: 0.8, need: Infinity, t: 1, gain: 0, seed: Math.floor(r() * 1e9), patho: true }; }
    return { bs, spares };
  };
  // simulate one strategy on a world; returns {flips, cov, log}
  const makeState = (w) => ({ time: 0, flips: 0, cov: 0, sp: 0, rr: 0, bs: w.bs.map(b => ({ ...b, rng: U.rng(b.seed), pt: 0, tt: 0, sc: 1, dec: 0, hits: 0 })), spares: w.spares });
  const score = (b) => Math.log(b.pt + 0.5) - Math.log(b.tt + 1) - Math.log(b.sc);
  const stepState = (S, idx) => {
    const b = S.bs[idx]; S.time += b.t; b.tt += b.t; b.sc += 1; b.hits++;
    const decreased = b.rng() < b.p; let flipped = false;
    if (decreased) { b.pt += b.t; b.dec++; if (b.dec >= b.need) flipped = true; }
    let out = { b: b.id, decreased, flipped, gain: b.gain };
    if (flipped) { S.flips++; S.cov += b.gain; const nb = S.spares[S.sp++ % S.spares.length]; S.bs[idx] = { ...nb, rng: U.rng(nb.seed), pt: 0, tt: 0, sc: 1, dec: 0, hits: 0 }; }
    return out;
  };
  const autoRun = (w, strat) => {
    const S = makeState(w);
    while (S.time < BUDGET) {
      let idx;
      if (strat === "rr") idx = S.rr++ % S.bs.length;
      else { idx = 0; let best = -Infinity; S.bs.forEach((b, i) => { const s = score(b); if (s > best) { best = s; idx = i; } }); }
      if (S.time + S.bs[idx].t > BUDGET) break;
      stepState(S, idx);
    }
    return S;
  };
  const newWorld = () => {
    const seed = Math.floor(Math.random() * 1e9); world = mkWorld(seed); manual = makeState(world);
    U.$(root, "#ss-log").innerHTML = `<span class="dim">New world. Five frontier branches with hidden difficulty and seed speed.</span>\n`;
    U.$(root, "#ss-result").hidden = true; render();
  };
  const render = () => {
    const S = manual;
    U.$(root, "#ss-time").textContent = `time ${S.time}/${BUDGET}`;
    U.$(root, "#ss-flips").textContent = `flips ${S.flips} · +${S.cov} edges`;
    U.$(root, "#ss-tab").innerHTML = `<tr><th>Branch</th><th class="num">t/run</th><th class="num">PT</th><th class="num">TT</th><th class="num">SC</th><th class="num">TS[b].d</th><th class="num">score</th><th></th></tr>` +
      S.bs.map((b, i) => `<tr><td class="mono">${b.id}${b.patho ? "*" : ""}</td><td class="num">${b.t}</td><td class="num">${b.pt}</td><td class="num">${b.tt}</td><td class="num">${b.sc}</td><td class="num">${b.need === Infinity ? "∞→?" : Math.max(0, b.need - b.dec) * 10}</td><td class="num">${score(b).toFixed(2)}</td><td><button class="btn sm" data-i="${i}" ${S.time + b.t > BUDGET ? "disabled" : ""}>Schedule</button></td></tr>`).join("");
    U.$$(root, "#ss-tab button").forEach(bt => bt.onclick = () => play(+bt.dataset.i));
  };
  const L = (h) => { const lg = U.$(root, "#ss-log"); lg.insertAdjacentHTML("beforeend", h + "\n"); lg.scrollTop = lg.scrollHeight; };
  const play = (idx) => {
    if (manual.time >= BUDGET) return;
    const o = stepState(manual, idx);
    L(o.flipped ? `<span class="good">${o.b}: δ dropped to 0, FLIPPED, +${o.gain} edges. A new frontier branch appears.</span>` : o.decreased ? `${o.b}: δ decreased (productive time ↑)` : `<span class="dim">${o.b}: no decrease</span>`);
    render();
    if (Math.min(...manual.bs.map(b => b.t)) + manual.time > BUDGET) finish();
  };
  const finish = () => {
    const rr = autoRun(world, "rr"), fox = autoRun(world, "fox");
    // average over many worlds (statistics)
    let a = 0, f = 0; const N = 300;
    for (let k = 0; k < N; k++) { const w = mkWorld(k * 7919 + 13); a += autoRun(w, "rr").cov; f += autoRun(w, "fox").cov; }
    const res = U.$(root, "#ss-result"); res.hidden = false;
    res.innerHTML = `<div class="eyebrow">Same world, same random outcomes</div>
      <div class="bars" style="margin:8px 0">${[["You", manual.cov, "var(--boot)"], ["Round-robin (AFL-like)", rr.cov, "var(--muted)"], ["FOX greedy", fox.cov, "var(--fox)"]].map(([n, v, c]) =>
        `<div class="barrow"><span class="lbl">${n}</span><div class="bartrack"><i style="width:${Math.max(2, v / Math.max(1, rr.cov, fox.cov, manual.cov) * 100)}%;background:${c}"></i></div><span class="val">+${v}</span></div>`).join("")}</div>
      <div class="small">Average over ${N} random worlds: round-robin +${(a / N).toFixed(1)} edges, FOX greedy +${(f / N).toFixed(1)} edges (${((f / a - 1) * 100).toFixed(0)}% more).</div>
      <div class="small muted" style="margin-top:6px">Hidden truth: ${world.bs.map(b => `${b.id} p=${b.p}${b.need === Infinity ? " (never flips)" : ", needs " + b.need}`).join(" · ")}</div>
      ${patho ? `<div class="callout trap small" style="margin-top:8px">B5* keeps lowering δ but can never flip. FOX's estimate pt/tt looks great for it, and only the SC decay stops the scheduler from wasting everything on it. That's why the paper plans "aggressive re-weighting" for pathological branches.</div>` : ""}`;
    api.done();
  };
  U.$(root, "#ss-auto").onclick = () => { let idx = 0, best = -Infinity; manual.bs.forEach((b, i) => { const s = score(b); if (s > best && manual.time + b.t <= BUDGET) { best = s; idx = i; } }); play(idx); };
  U.$(root, "#ss-new").onclick = newWorld;
  U.$(root, "#ss-patho").onchange = (e) => { patho = e.target.checked; newWorld(); };
  newWorld();
};

/* =====================================================================
   FOX · Newton's Leap
   ===================================================================== */
G.newtonLeap = function (root, api) {
  const MAXX = 1023;
  const MODES = {
    linear: { label: "Linear: if (3*x + 17 == 2000)", f: x => 3 * x + 17 - 2000, flip: x => 3 * x + 17 === 2000, x0: 120 },
    convex: { label: "Convex-ish: if (x*x/64 + x > 9000)", f: x => x * x / 64 + x - 9000, flip: x => x * x / 64 + x > 9000, x0: 200 },
    hash: { label: "Non-convex: if (crc8(x) == 0x5A)", f: x => crc(x) - 0x5A, flip: x => crc(x) === 0x5A, x0: 300 }
  };
  function crc(x) { let c = x & 0xff ^ (x >> 8) * 0x1d; for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; return c; }
  let mode = "linear", x, samples = [], g = null, tries = 0, steps = 0, newtonFlips = 0, mpPass = 0, mpTot = 0;
  const deltaOf = (m, x) => { const v = MODES[m].f(x); if (m === "linear" || m === "hash") return Math.abs(v); return 1 - v; }; // = : |f| ; > (false) : 1 - f
  root.innerHTML = `<div class="sim">
    <div class="chips" id="nl-chips">${Object.entries(MODES).map(([k, v]) => `<button class="chip" data-m="${k}">${k}</button>`).join("")}</div>
    <div class="codeblock" id="nl-code"></div>
    <canvas id="nl-cv"></canvas>
    <div class="legend"><span><i style="background:var(--fox)"></i>δ(x)</span><span><i style="background:var(--boot)"></i>local-search samples</span><span><i style="background:var(--cov)"></i>linear model g → root</span></div>
    <div class="kv panel" id="nl-kv"></div>
    <div class="grid2">
      <button class="btn" id="nl-havoc">Random havoc ×100</button>
      <button class="btn" id="nl-ls">Local search (k=32)</button>
    </div>
    <button class="btn primary" id="nl-newton" disabled>Newton step: x − δ/g</button>
    <div class="panel small" id="nl-msg"></div>
  </div>`;
  const reset = () => { x = MODES[mode].x0; samples = []; g = null; tries = 0; steps = 0; mpPass = 0; mpTot = 0; U.$(root, "#nl-newton").disabled = true; msg(""); render(); };
  const msg = (h) => U.$(root, "#nl-msg").innerHTML = h || (mode === "hash" ? "This branch compares a checksum. Try local search and Newton and see what happens." : "Run local search to estimate the slope, then take a Newton step.");
  const render = () => {
    U.$$(root, "#nl-chips button").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
    const M = MODES[mode];
    U.$(root, "#nl-code").innerHTML = `<span class="k">${U.esc(M.label)}</span>\n<span class="c">// Q₀ = false, so δ = ${mode === "convex" ? "1 − f(x)  (row: false, >)" : "|f(x)|  (row: false, =)"}</span>`;
    const d = deltaOf(mode, x);
    U.$(root, "#nl-kv").innerHTML = `<span>x</span><b>${x}</b><span>δ(x)</span><b>${Number.isInteger(d) ? d : d.toFixed(1)}</b><span>subgradient g</span><b>${g === null ? "n/a" : g.toFixed(3)}</b><span>havoc tries</span><b>${U.fmt(tries)}</b><span>Newton steps</span><b>${steps}</b>${mpTot ? `<span>midpoint-convex</span><b>${mpPass}/${mpTot} sample pairs</b>` : ""}<span>status</span><b style="color:${M.flip(x) ? "var(--cov)" : "var(--muted)"}">${M.flip(x) ? "FLIPPED" : "not flipped"}</b>`;
    const cv = U.$(root, "#nl-cv"), ctx = U.canvas(cv, 190), W = ctx.W, H = ctx.H, pad = 8;
    const vals = []; for (let t = 0; t <= MAXX; t += 1) vals.push(deltaOf(mode, t));
    let lo = Math.min(0, ...vals), hi = Math.max(...vals); if (hi - lo < 1) hi = lo + 1;
    const X = t => pad + (t / MAXX) * (W - 2 * pad), Y = v => 8 + (1 - (v - lo) / (hi - lo)) * (H - 22);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = U.css("--line"); ctx.beginPath(); ctx.moveTo(pad, Y(0)); ctx.lineTo(W - pad, Y(0)); ctx.stroke();
    ctx.strokeStyle = U.css("--fox"); ctx.lineWidth = mode === "hash" ? 1 : 2; ctx.beginPath();
    vals.forEach((v, t) => t ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v))); ctx.stroke();
    ctx.fillStyle = U.css("--boot"); samples.forEach(([sx, sd]) => { ctx.beginPath(); ctx.arc(X(sx), Y(sd), 3, 0, 7); ctx.fill(); });
    if (g) { // tangent line from x to root
      const root_ = x - d / g; ctx.strokeStyle = U.css("--cov"); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(X(x), Y(d)); ctx.lineTo(X(U.clamp(root_, 0, MAXX)), Y(d - g * (U.clamp(root_, 0, MAXX) - x))); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = U.css("--ink"); ctx.beginPath(); ctx.arc(X(x), Y(d), 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = U.css("--muted"); ctx.font = "11px " + U.css("--f-mono"); ctx.fillText("x=0", pad, H - 2); ctx.fillText("x=1023", W - 52, H - 2);
  };
  U.$$(root, "#nl-chips button").forEach(b => b.onclick = () => { mode = b.dataset.m; reset(); });
  U.$(root, "#nl-havoc").onclick = () => {
    const M = MODES[mode]; let hit = null;
    for (let k = 0; k < 100; k++) { tries++; const c = U.ri(0, MAXX); if (M.flip(c)) { hit = c; break; } }
    if (hit !== null) { x = hit; msg(`Havoc got lucky after ${U.fmt(tries)} tries. Equality on a 10-bit value succeeds about 1 time in 1,024 per try, and real inputs are much wider.`); }
    else msg(`${U.fmt(tries)} random tries, no flip. Blind mutation ignores the branch's structure.`);
    render();
  };
  U.$(root, "#nl-ls").onclick = () => {
    const d0 = deltaOf(mode, x); samples = []; let best = null;
    for (let k = 0; k < 32; k++) {
      let xp = U.clamp(x + U.ri(-24, 24), 0, MAXX); if (xp === x) continue;
      const dp = deltaOf(mode, xp); samples.push([xp, dp]);
      const gp = (dp - d0) / (xp - x);
      if (best === null || Math.abs(gp) > Math.abs(best)) best = gp;
    }
    // midpoint convexity check on pairs of samples
    for (let k = 0; k + 1 < samples.length; k += 2) { const [a, da] = samples[k], [b, db] = samples[k + 1]; const m = Math.round((a + b) / 2); mpTot++; if (deltaOf(mode, m) <= (da + db) / 2 + 1e-9) mpPass++; }
    g = best; U.$(root, "#nl-newton").disabled = !g;
    msg(g ? `Estimated g = ${g.toFixed(3)}, the largest |slope| among ${samples.length} neighbours (FOX takes the max L1 norm, an under-approximation). Now take the Newton step.` : "Every sample had the same δ, so the slope is zero and Newton can't be used. FOX would skip this branch.");
    render();
  };
  U.$(root, "#nl-newton").onclick = () => {
    const M = MODES[mode], d = deltaOf(mode, x);
    let nx = Math.round(x - d / g); nx = U.clamp(nx, 0, MAXX); steps++;
    const prev = d; x = nx; g = null; U.$(root, "#nl-newton").disabled = true;
    const nd = deltaOf(mode, x);
    if (M.flip(x)) { newtonFlips++; msg(`<b>Flipped in ${steps} Newton step${steps > 1 ? "s" : ""}.</b> ${mode === "linear" ? "A linear δ flips in one step, because the root of the model is the true root." : "Convex δ: each step lands closer, and a step or two is enough."}`); if (mode !== "hash") api.done(); }
    else if (mode === "hash") msg(`δ went ${prev} → ${nd}. The checksum is non-convex: local slopes say nothing about where the root is, so Newton jumps somewhere arbitrary. ${mpTot ? `Midpoint convexity held for only ${mpPass}/${mpTot} pairs.` : ""} This is FOX's stated limitation (checksums, hashes, complex string ops).`);
    else msg(`δ went ${Number(prev).toFixed(1)} → ${Number(nd).toFixed(1)}. Not flipped yet. Run local search again from the new point.`);
    if (mode === "hash" && steps >= 2) api.done();
    samples = []; render();
  };
  reset();
  window.addEventListener("resize", render, { passive: true });
};

/* =====================================================================
   FOX · Hot Byte Hunter
   ===================================================================== */
G.hotBytes = function (root, api) {
  const TARGET = "FOX!", OFF = 3;
  let inp = "HDRabcdEND".split("").map(c => c.charCodeAt(0));
  const hot = new Set(), probed = new Set(); let inferred = false, solved = false, probes = 0;
  root.innerHTML = `<div class="sim">
    <div class="codeblock"><span class="c">// target</span>
<span class="k">if</span> (strncmp(buf + 3, <span class="s">"FOX!"</span>, 4) == 0) bug();
<span class="c">// FOX sees op1 = bytes of buf+3.., op2 = "FOX!" → δ[i] = op1[i] − op2[i]</span></div>
    <div class="eyebrow">Input bytes (tap one to probe it with a single-byte change)</div>
    <div class="bytes" id="hb-in"></div>
    <div class="eyebrow">Byte-wise branch distances δ[0..3]</div>
    <div class="bytes" id="hb-d"></div>
    <div class="row"><button class="btn sm" id="hb-infer" disabled>Infer the other hot bytes</button><button class="btn sm primary" id="hb-solve" disabled>Newton on every hot byte</button></div>
    <div class="panel small" id="hb-msg">Probing every byte, as taint-style approaches do, costs one execution per byte. Find a single hot byte, then use adjacency.</div>
  </div>`;
  const dist = () => TARGET.split("").map((c, i) => inp[OFF + i] - c.charCodeAt(0));
  const render = (changedIdx = -1, dchg = []) => {
    U.$(root, "#hb-in").innerHTML = inp.map((b, i) => `<span data-i="${i}" class="${hot.has(i) ? "hot" : ""} ${i === changedIdx ? "chg" : ""} ${solved && hot.has(i) ? "ok" : ""}" style="cursor:pointer">${U.esc(String.fromCharCode(b))}<br><small class="muted">${i}</small></span>`).join("");
    U.$(root, "#hb-d").innerHTML = dist().map((d, i) => `<span class="${dchg.includes(i) ? "chg" : ""} ${d === 0 ? "ok" : ""}">${d}</span>`).join("");
    U.$$(root, "#hb-in span").forEach(s => s.onclick = () => probe(+s.dataset.i));
  };
  const probe = (i) => {
    if (solved) return;
    const before = dist(); const save = inp[i]; inp[i] = (inp[i] + 1) & 0xff; probes++; probed.add(i);
    const after = dist(); const chg = after.map((d, k) => d !== before[k] ? k : -1).filter(k => k >= 0);
    render(i, chg); inp[i] = save;
    const m = U.$(root, "#hb-msg");
    if (chg.length) {
      hot.add(i); const j = chg[0];
      m.innerHTML = `Probe ${probes}: changing byte ${i} moved δ[${j}]. <b>Byte ${i} is hot</b> and maps to string position ${j}. The compared string has length 4, so the string starts at byte ${i - j}.`;
      U.$(root, "#hb-infer").disabled = false; U.$(root, "#hb-infer").dataset.start = i - j;
    } else m.innerHTML = `Probe ${probes}: byte ${i} changed nothing in δ, so it's not hot.`;
    setTimeout(() => render(), 650);
  };
  U.$(root, "#hb-infer").onclick = (e) => {
    const s = +e.target.dataset.start; for (let k = 0; k < 4; k++) hot.add(s + k); inferred = true;
    U.$(root, "#hb-solve").disabled = false; e.target.disabled = true;
    U.$(root, "#hb-msg").innerHTML = `Inferred hot bytes ${s}–${s + 3} from adjacency, after <b>${probes}</b> probe${probes > 1 ? "s" : ""} instead of ${inp.length}. That is FOX's shortcut: "hot bytes for a string comparison are typically adjacent."`;
    render();
  };
  U.$(root, "#hb-solve").onclick = () => {
    const d = dist(); [...hot].sort((a, b) => a - b).forEach((i, k) => { inp[i] = inp[i] - d[k]; }); // slope 1 each → x - δ/1
    solved = true; render();
    U.$(root, "#hb-msg").innerHTML = `Each byte comparison is linear with slope g = 1, so Newton gives x − δ/1 for every byte at once. Input is now "${String.fromCharCode(...inp)}". <b>strncmp == 0, branch flipped.</b>`;
    U.$(root, "#hb-solve").disabled = true; api.done();
  };
  render();
};

/* =====================================================================
   FOX · Results Explorer (Table 4 data)
   ===================================================================== */
G.foxResults = function (root, api) {
  const P = ["bsdtar", "exiv2", "ffmpeg", "jasper", "nm-new", "objdump", "pdftotext", "readelf", "size", "strip-new", "tcpdump", "tiff2pdf", "tiff2ps", "tiffcrop", "xmllint"];
  const D = { // FOX, AFLPP, AFLPP+C, FOX+D, AFLPP+CD  (Table 4, mean edges, 10 × 24h)
    FOX: [8893, 7618, 33544, 3811, 5475, 7196, 3490, 6551, 3619, 7330, 16996, 8061, 5257, 9298, 8347],
    AFLPP: [4508, 7526, 29268, 3400, 4049, 5484, 2482, 5767, 2934, 5718, 13399, 7731, 5206, 8763, 5179],
    "AFLPP+C": [4924, 9213, 25147, 3890, 5150, 6508, 3016, 4709, 3120, 6297, 17601, 7803, 5306, 8933, 5392],
    "FOX+D": [9194, 10631, 33821, 4257, 5841, 7536, 3410, 6462, 4037, 7930, 17524, 7974, 5411, 9254, 8628],
    "AFLPP+CD": [7811, 11306, 22692, 3870, 4724, 6619, 2982, 5549, 3167, 6306, 17841, 7830, 5463, 8835, 8696]
  };
  const PAIRS = [["FOX", "AFLPP", "26.45%"], ["FOX", "AFLPP+C", "16.98%"], ["FOX+D", "AFLPP+CD", "12.90%"]];
  let pi = 0, sort = false;
  root.innerHTML = `<div class="sim">
    <div class="chips" id="fr-chips">${PAIRS.map((p, i) => `<button class="chip" data-i="${i}">${p[0]} vs ${p[1]}</button>`).join("")}</div>
    <div class="row"><span class="pill" id="fr-sum"></span><span class="pill" id="fr-wins"></span><button class="btn sm ghost" id="fr-sort">Sort by gain</button></div>
    <div class="legend"><span><i style="background:var(--fox)"></i>FOX side</span><span><i style="background:var(--muted)"></i>AFL++ side</span></div>
    <div class="bars" id="fr-bars"></div>
    <div class="panel small" id="fr-note"></div>
  </div>`;
  const render = () => {
    const [a, b, avg] = PAIRS[pi];
    U.$$(root, "#fr-chips button").forEach((x, i) => x.classList.toggle("on", i === pi));
    let rows = P.map((n, i) => ({ n, A: D[a][i], B: D[b][i], g: U.pct(D[a][i], D[b][i]) }));
    if (sort) rows.sort((x, y) => y.g - x.g);
    const max = Math.max(...rows.map(r => Math.max(r.A, r.B)));
    const wins = rows.filter(r => r.A > r.B).length;
    U.$(root, "#fr-sum").textContent = `paper's mean gain: ${avg}`;
    U.$(root, "#fr-wins").textContent = `${a} higher on ${wins}/15`;
    U.$(root, "#fr-bars").innerHTML = rows.map(r => `<div class="barrow"><span class="lbl">${r.n}</span>
      <div class="bartrack"><i style="width:${r.A / max * 100}%;background:var(--fox)"></i><i style="width:${r.B / max * 100}%;background:var(--muted)"></i></div>
      <span class="val" style="color:${r.g >= 0 ? "var(--cov)" : "var(--bad)"}">${r.g >= 0 ? "+" : ""}${r.g.toFixed(1)}%</span></div>`).join("");
    const notes = [
      "bsdtar: +97.25% over AFL++. ffmpeg is huge (741k edges) and FOX still gains 14.6%. exiv2 and tiff2ps differences are <b>not statistically significant</b> (Mann-Whitney).",
      "AFLPP+C (cmplog) is FOX's closest relative. It wins on exiv2, jasper, tcpdump and tiff2ps. For jasper and tcpdump the difference is not significant.",
      "With dictionaries on both sides: ffmpeg +49.04%. AFLPP+CD's small leads on tcpdump and xmllint are not statistically significant."
    ];
    U.$(root, "#fr-note").innerHTML = notes[pi] + " Coverage was measured with AFL++'s own bitmap module.";
  };
  U.$$(root, "#fr-chips button").forEach(x => x.onclick = () => { pi = +x.dataset.i; render(); api.done(); });
  U.$(root, "#fr-sort").onclick = () => { sort = !sort; render(); };
  render();
  setTimeout(() => api.done(), 4000);
};
})();
