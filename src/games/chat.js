(function () {
const U = FL.U, G = FL.GAMES;
const TYPES = ["OPTIONS", "DESCRIBE", "SETUP", "PLAY", "PAUSE", "RECORD", "ANNOUNCE", "TEARDOWN", "GET_PARAMETER", "SET_PARAMETER"];

/* RTSP state machine exactly as in Figure 2 of the paper (RFC 2326). */
function rtspNext(state, m) {
  const T = {
    INIT: { SETUP: "READY", ANNOUNCE: "READY", DESCRIBE: "INIT", OPTIONS: "INIT", TEARDOWN: "INIT" },
    READY: { PLAY: "PLAY", RECORD: "RECORD", TEARDOWN: "INIT", SETUP: "READY", OPTIONS: "READY", SET_PARAMETER: "READY", GET_PARAMETER: "READY" },
    PLAY: { PAUSE: "READY", TEARDOWN: "INIT", PLAY: "PLAY", SETUP: "PLAY", OPTIONS: "PLAY", GET_PARAMETER: "PLAY", SET_PARAMETER: "PLAY" },
    RECORD: { PAUSE: "READY", TEARDOWN: "INIT", RECORD: "RECORD", SETUP: "RECORD", OPTIONS: "RECORD", SET_PARAMETER: "RECORD", GET_PARAMETER: "RECORD" }
  };
  return T[state][m];
}
const NEEDS_SESSION = new Set(["PLAY", "PAUSE", "RECORD", "TEARDOWN", "GET_PARAMETER", "SET_PARAMETER"]);

function stateSVG(cur, seenT) {
  const P = { INIT: [55, 70], READY: [175, 70], PLAY: [295, 70], RECORD: [175, 175] };
  const E = [["INIT", "READY", "SETUP/ANNOUNCE", -1], ["READY", "INIT", "TEARDOWN", 1], ["READY", "PLAY", "PLAY", -1], ["PLAY", "READY", "PAUSE", 1], ["READY", "RECORD", "RECORD", -1], ["RECORD", "READY", "PAUSE", 1], ["PLAY", "INIT", "TEARDOWN", 0], ["RECORD", "INIT", "TEARDOWN", 0]];
  let s = `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker>
  <marker id="arrc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--chat)"/></marker></defs>`;
  E.forEach(([a, b, lbl, bend]) => {
    const [x1, y1] = P[a], [x2, y2] = P[b]; const key = a + ">" + b; const seen = seenT.has(key);
    const col = seen ? "var(--chat)" : "var(--muted)";
    let d, lx, ly;
    if (bend === 0) { // long curve under
      const midx = (x1 + x2) / 2; d = `M${x1},${y1 + 26} Q${midx},${a === "PLAY" ? 150 : 240} ${x2 + (a === "PLAY" ? 10 : -6)},${y2 + 26}`;
      lx = a === "PLAY" ? 240 : 80; ly = a === "PLAY" ? 128 : 190;
      if (a === "RECORD") d = `M${x1 - 34},${y1} Q${70},${175} ${x2 - 6},${y2 + 28}`;
    } else {
      const off = bend * 12; const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const sx = x1 + dx / len * 34 + nx * off, sy = y1 + dy / len * 26 + ny * off, ex = x2 - dx / len * 36 + nx * off, ey = y2 - dy / len * 28 + ny * off;
      d = `M${sx},${sy} L${ex},${ey}`; lx = (sx + ex) / 2 + nx * 11; ly = (sy + ey) / 2 + ny * 11 + 3;
    }
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${seen ? 2.4 : 1.3}" marker-end="url(#${seen ? "arrc" : "arr"})"/>`;
    s += `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="9" font-family="var(--f-mono)" fill="${col}">${lbl}</text>`;
  });
  Object.entries(P).forEach(([n, [x, y]]) => {
    const on = n === cur;
    s += `<rect x="${x - 34}" y="${y - 18}" width="68" height="36" rx="10" fill="${on ? "var(--chat)" : "var(--paper)"}" stroke="${on ? "var(--chat)" : "var(--line)"}" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12.5" font-weight="700" font-family="var(--f-mono)" fill="${on ? "var(--paper)" : "var(--ink)"}">${n}</text>`;
  });
  return s;
}

/* =====================================================================
   ChatAFL · Live555 Simulator
   ===================================================================== */
G.rtspServer = function (root, api) {
  let state = "INIT", session = null, cseq = 1, pausedFromPlay = false, crashed = false;
  const codes = new Set(), trans = new Set();
  root.innerHTML = `<div class="sim">
    <svg id="rs-svg" viewBox="0 0 350 215"></svg>
    <div class="row"><span class="pill" id="rs-st"></span><span class="pill good" id="rs-cov"></span></div>
    <div class="row small">
      <label class="row" style="gap:6px"><input type="checkbox" id="rs-sess" checked> copy Session ID from server reply</label>
      <label class="row" style="gap:6px"><input type="checkbox" id="rs-byte"> byte-mutate the next message</label>
      <label class="row" style="gap:6px"><input type="checkbox" id="rs-rfc"> strict RFC (pretend ANNOUNCE/RECORD work)</label>
    </div>
    <div class="msgbtns" id="rs-btns">${TYPES.map(t => `<button class="btn" data-t="${t}">${t}</button>`).join("")}</div>
    <div class="log" id="rs-log"><span class="dim">Server listening on rtsp://127.0.0.1:8554. State INIT.</span>\n</div>
    <div class="row"><button class="btn sm ghost" id="rs-reset">Restart server</button></div>
    <div class="callout small">Goal: reproduce <b>bug #1</b>. The response codes here are illustrative (RFC 2326 style). In AFLNet each distinct code counts as a state.</div>
  </div>`;
  const L = (h) => { const lg = U.$(root, "#rs-log"); lg.insertAdjacentHTML("beforeend", h + "\n"); lg.scrollTop = lg.scrollHeight; };
  const render = () => {
    U.$(root, "#rs-svg").innerHTML = stateSVG(state, trans);
    U.$(root, "#rs-st").textContent = `state ${state}${session ? " · Session " + session : ""}`;
    U.$(root, "#rs-cov").textContent = `codes seen ${codes.size} · transitions ${trans.size}/8`;
  };
  const send = (m) => {
    if (crashed) return;
    const byte = U.$(root, "#rs-byte").checked, rfc = U.$(root, "#rs-rfc").checked, useS = U.$(root, "#rs-sess").checked;
    let line = `${m} rtsp://127.0.0.1:8554/aacAudioTest/ RTSP/1.0`;
    if (byte) { const arr = line.split(""); const i = U.ri(0, Math.min(arr.length - 1, 30)); arr[i] = String.fromCharCode(U.ri(33, 126)); line = arr.join(""); U.$(root, "#rs-byte").checked = false; }
    const sess = NEEDS_SESSION.has(m) ? (useS && session ? session : "DEADBEEF") : null;
    L(`<span class="dim">→ ${U.esc(line)} | CSeq: ${cseq}${sess ? " | Session: " + sess : ""}</span>`);
    cseq++;
    let code, text, next = state;
    const valid = line.startsWith(m + " ") && line.endsWith("RTSP/1.0");
    if (!valid) { code = 400; text = "Bad Request (the parser rejected the message before any state logic ran)"; }
    else if (!rfc && (m === "ANNOUNCE" || m === "RECORD")) { code = 405; text = "Method Not Allowed (Live555 does not support it, as in the case study)"; }
    else if (sess && sess !== session) { code = 454; text = "Session Not Found (wrong session ID: the LLM-without-context problem)"; }
    else {
      const n = rtspNext(state, m);
      if (!n) { code = 455; text = `Method Not Valid in This State (${m} in ${state})`; }
      else {
        code = 200; text = "OK"; next = n;
        if (m === "SETUP" && !session) session = (0x22B8 + U.ri(0, 4000)).toString(16).toUpperCase().padStart(8, "0");
        if (m === "PAUSE" && state === "PLAY") pausedFromPlay = true;
        if (m === "SETUP" && state === "INIT") pausedFromPlay = false;
        if (m === "TEARDOWN") { session = null; pausedFromPlay = false; }
        if (m === "PLAY" && state === "READY" && pausedFromPlay) {
          crashed = true;
          L(`<span class="bad">=================================================================
==1337==ERROR: AddressSanitizer: heap-use-after-free on address 0x6060000002c8
READ of size 8 at 0x6060000002c8 thread T0
    #0 in StreamState::startPlaying  (simulated trace)
freed by thread T0 here:
    #0 in operator delete
    #1 in RTSPServer::RTSPClientSession::handleCmd_PAUSE
SUMMARY: AddressSanitizer: heap-use-after-free</span>`);
          L(`<span class="good">You reproduced bug #1: SETUP → PLAY → PAUSE → PLAY. PAUSE freed the track's usage environment and PLAY used it again. PAUSE was missing from ProFuzzBench's seeds, and ChatAFL's seed enrichment is what added it.</span>`);
          trans.add(state + ">" + next); state = next; render(); api.done(); return;
        }
      }
    }
    codes.add(code);
    if (next !== state) trans.add(state + ">" + next);
    L(`<span class="${code === 200 ? "good" : code >= 450 ? "warn" : "bad"}">← RTSP/1.0 ${code} ${text}</span>`);
    state = next; render();
  };
  U.$$(root, "#rs-btns button").forEach(b => b.onclick = () => send(b.dataset.t));
  U.$(root, "#rs-reset").onclick = () => { state = "INIT"; session = null; cseq = 1; pausedFromPlay = false; crashed = false; L(`<span class="dim">--- server restarted ---</span>`); render(); };
  render();
};

/* =====================================================================
   ChatAFL · Grammar Painter
   ===================================================================== */
G.grammarPainter = function (root, api) {
  const TOK = [["PLAY", 0], [" ", -1], ["rtsp://127.0.0.1:8554/aacAudioTest/", 1], [" ", -1], ["RTSP/1.0", 0], ["\\r\\n", -1], ["\n", -2],
    ["CSeq:", 0], [" ", -1], ["4", 1], ["\\r\\n", -1], ["\n", -2],
    ["User-Agent:", 0], [" ", -1], ["./testRTSPClient (LIVE555 Streaming Media v2018.08.28)", 1], ["\\r\\n", -1], ["\n", -2],
    ["Session:", 0], [" ", -1], ["000022B8", 1], ["\\r\\n", -1], ["\n", -2],
    ["Range:", 0], [" ", -1], ["npt=0.000-", 1], ["\\r\\n", -1]];
  const marked = new Set(); let checked = false;
  root.innerHTML = `<div class="sim">
    <div class="panel msgline" id="gp-msg"></div>
    <div class="row"><button class="btn sm" id="gp-check">Check my grammar</button><span class="small muted" id="gp-score"></span></div>
    <div class="codeblock" id="gp-gram" hidden></div>
    <div class="grid2" id="gp-mut" style="display:none">
      <button class="btn" id="gp-byte">Byte mutation ×200</button>
      <button class="btn primary" id="gp-gmut">Grammar mutation ×200</button>
    </div>
    <div class="panel small" id="gp-out">Tap the tokens that should become &lt;Value&gt;. Keywords such as PLAY, RTSP/1.0, header names and CRLF are immutable.</div>
  </div>`;
  const render = () => {
    U.$(root, "#gp-msg").innerHTML = TOK.map(([t, k], i) => k === -2 ? "<br>" : k === -1 ? `<span class="muted">${U.esc(t === " " ? "·" : t)}</span>` :
      `<span class="tok ${marked.has(i) ? (checked && k === 0 ? "wrongmark" : "mut") : ""}" data-i="${i}">${U.esc(t)}</span>`).join("");
    U.$$(root, "#gp-msg .tok").forEach(s => s.onclick = () => { const i = +s.dataset.i; marked.has(i) ? marked.delete(i) : marked.add(i); checked = false; render(); });
  };
  U.$(root, "#gp-check").onclick = () => {
    checked = true; const want = TOK.map((t, i) => t[1] === 1 ? i : -1).filter(i => i >= 0);
    const right = want.filter(i => marked.has(i)).length, wrong = [...marked].filter(i => TOK[i][1] === 0).length;
    U.$(root, "#gp-score").textContent = `${right}/${want.length} values found, ${wrong} keyword${wrong === 1 ? "" : "s"} wrongly marked`;
    render();
    if (right === want.length && wrong === 0) {
      U.$(root, "#gp-gram").hidden = false;
      U.$(root, "#gp-gram").innerHTML = `PLAY: {<span class="k">PLAY</span> &lt;Value&gt; <span class="k">RTSP/1.0</span>\\r\\n,\n       <span class="k">CSeq:</span> &lt;Value&gt;\\r\\n,\n       <span class="k">User-Agent:</span> &lt;Value&gt;\\r\\n,\n       <span class="k">Session:</span> &lt;Value&gt;\\r\\n,\n       <span class="k">Range:</span> &lt;Value&gt;\\r\\n}   <span class="c">// matches Figure 3</span>`;
      U.$(root, "#gp-mut").style.display = "grid";
      U.$(root, "#gp-out").innerHTML = "That is exactly the grammar ChatAFL stores in G = {type → grammar}. At runtime it regex-matches each header against the grammar and mutates only the &lt;Value&gt; regions. Now compare the two mutators.";
    } else U.$(root, "#gp-out").innerHTML = "Not quite. Values are the parts a client could legitimately change: the URL, the sequence number, the user agent, the session ID and the range.";
  };
  const INTERESTING = ["A".repeat(4096), "%s%s%s%n", "-1", "0", "4294967296", "../../../../etc/passwd", "npt=99999999-", "\u0000", "*", "' OR 1=1"];
  const run = (grammar) => {
    let acc = 0, deep = 0; const ex = [];
    const base = TOK.filter(t => t[1] !== -2).map(t => t[0]);
    for (let k = 0; k < 200; k++) {
      let toks = base.slice();
      if (grammar) { const vals = TOK.filter(t => t[1] !== -2).map((t, i) => t[1] === 1 ? i : -1).filter(i => i >= 0); const i = U.pick(vals); toks[i] = U.pick(INTERESTING); }
      else { const s = toks.join(""); const arr = s.split(""); const n = U.ri(1, 4); for (let j = 0; j < n; j++) arr[U.ri(0, arr.length - 1)] = String.fromCharCode(U.ri(0, 255)); toks = [arr.join("")]; }
      const msg = toks.join("");
      const ok = /^PLAY .* RTSP\/1\.0\\r\\nCSeq: .*\\r\\nUser-Agent: .*\\r\\nSession: .*\\r\\nRange: .*\\r\\n$/.test(msg);
      if (ok) { acc++; if (!/^4$/.test(msg.split("CSeq: ")[1].split("\\r\\n")[0]) || true) deep++; }
      if (ex.length < 3) ex.push((ok ? "✓ " : "✗ ") + msg.slice(0, 70).replace(/[^\x20-\x7e]/g, "·") + (msg.length > 70 ? "…" : ""));
    }
    return { acc, ex };
  };
  U.$(root, "#gp-byte").onclick = () => { const r = run(false); U.$(root, "#gp-out").innerHTML = `<b>Byte mutation: ${r.acc}/200 parsed.</b> Random bytes often land in a keyword or a CRLF, and the parser rejects the message before reaching the PLAY handler.<div class="log" style="margin-top:6px">${r.ex.map(U.esc).join("\n")}</div>`; };
  U.$(root, "#gp-gmut").onclick = () => { const r = run(true); U.$(root, "#gp-out").innerHTML = `<b>Grammar mutation: ${r.acc}/200 parsed.</b> Structure is preserved, so every message reaches the deeper handling code with nasty values: huge strings, format strings, negative numbers, path traversal. ChatAFL still uses random mutation with lower probability, to explore corner cases.<div class="log" style="margin-top:6px">${r.ex.map(U.esc).join("\n")}</div>`; api.done(); };
  render();
};

/* =====================================================================
   ChatAFL · Self-consistency (majority vote over 5 answers)
   ===================================================================== */
G.selfConsistency = function (root, api) {
  const FULL = {
    OPTIONS: ["CSeq", "User-Agent"], DESCRIBE: ["CSeq", "User-Agent", "Accept"], SETUP: ["CSeq", "User-Agent", "Transport"],
    PLAY: ["CSeq", "User-Agent", "Session", "Range"], PAUSE: ["CSeq", "User-Agent", "Session"], TEARDOWN: ["CSeq", "User-Agent", "Session"],
    GET_PARAMETER: ["CSeq", "User-Agent", "Session"], SET_PARAMETER: ["CSeq", "User-Agent", "Session"], ANNOUNCE: ["CSeq", "Session", "Content-Type"], RECORD: ["CSeq", "Session", "Range"]
  };
  const clone = () => JSON.parse(JSON.stringify(FULL));
  const ANSWERS = [
    () => clone(),
    () => { const a = clone(); a.PLAY = ["CSeq", "User-Agent", "Session"]; return a; },                       // forgot optional Range
    () => { const a = clone(); a["SET_DESCRIPTION"] = ["CSeq", "Session"]; return a; },                       // hallucinated type
    () => { const a = clone(); ["GET_PARAMETER", "SET_PARAMETER", "ANNOUNCE", "RECORD"].forEach(k => delete a[k]); return a; }, // ignored "all"
    () => { const a = clone(); a.PLAY = ["CSeq", "User-Agent", "Session"]; return a; }
  ];
  const got = [];
  root.innerHTML = `<div class="sim">
    <div class="codeblock small"><span class="c">// prompt (temperature 0.5)</span>
For the RTSP protocol, the PLAY client request grammar is: …   <span class="c">// shot 1</span>
For the HTTP protocol, the GET client request grammar is: …    <span class="c">// shot 2</span>
For the RTSP protocol, all of client request grammar is:</div>
    <div class="row"><button class="btn primary" id="sc-ask">Ask the LLM (1/5)</button><button class="btn" id="sc-vote" disabled>Majority vote</button></div>
    <div class="stack" id="sc-ans"></div>
    <div class="panel small" id="sc-out">Each answer is sampled independently, so look for the noise.</div>
  </div>`;
  const ask = () => {
    if (got.length >= 5) return;
    const a = ANSWERS[got.length](); got.push(a);
    const notes = ["Clean answer.", "PLAY is missing the optional Range field. The paper saw this in 15 of 50 answers.", "It invented a 'SET_DESCRIPTION' type. Rare in the paper: each random type appeared only once.", "It ignored the word 'all' and stopped after six types. ChatAFL just asks again for the rest.", "Range missing again."];
    U.$(root, "#sc-ans").insertAdjacentHTML("beforeend", `<div class="panel small"><b>Answer ${got.length}</b>: ${Object.keys(a).length} types · <span class="muted">${notes[got.length - 1]}</span><div class="mono" style="margin-top:4px;word-break:break-word">${Object.entries(a).map(([k, v]) => `${k}{${v.join(",")}}`).join(" ")}</div></div>`);
    U.$(root, "#sc-ask").textContent = got.length < 5 ? `Ask the LLM (${got.length + 1}/5)` : "5 answers collected";
    U.$(root, "#sc-ask").disabled = got.length >= 5;
    U.$(root, "#sc-vote").disabled = got.length < 5;
  };
  const vote = () => {
    const types = {}; got.forEach(a => Object.keys(a).forEach(t => types[t] = (types[t] || 0) + 1));
    const final = {}; const rows = [];
    Object.entries(types).forEach(([t, n]) => {
      const keep = n >= 3;
      if (keep) {
        const fc = {}; got.filter(a => a[t]).forEach(a => a[t].forEach(f => fc[f] = (fc[f] || 0) + 1));
        final[t] = Object.entries(fc).filter(([f, c]) => c * 2 > n || (c >= 2 && f === "Range")).map(([f]) => f);
      }
      rows.push(`<tr><td class="mono">${t}</td><td class="num">${n}/5</td><td>${keep ? `<span class="pill good">kept</span>` : `<span class="pill bad">dropped</span>`}</td><td class="mono small">${keep ? final[t].join(", ") : ""}</td></tr>`);
    });
    U.$(root, "#sc-out").innerHTML = `<div class="scrollx"><table class="data"><tr><th>Type</th><th class="num">votes</th><th></th><th>fields</th></tr>${rows.join("")}</table></div>
      <p style="margin-top:8px">The hallucinated type is dropped, all ten real types survive, and the stored grammar has the fields most answers agree on. ChatAFL used <b>5 repetitions</b> because the case study showed that was enough to filter incorrect cases.</p>
      <p class="muted">Field-level voting here is a simplification. The paper says it takes "the majority of consistent answers as the final grammar." PLAY's Range field appeared in 3 of 5 answers here (35 of 50 in the paper), so it is kept.</p>`;
    api.done();
  };
  U.$(root, "#sc-ask").onclick = ask; U.$(root, "#sc-vote").onclick = vote;
};

/* =====================================================================
   ChatAFL · Seed Enrichment
   ===================================================================== */
G.seedEnrich = function (root, api) {
  const seed = ["DESCRIBE", "SETUP", "PLAY", "TEARDOWN"];
  const sel = new Set(); let phase = 1; let seq = seed.slice(); let pending = ["PAUSE", "GET_PARAMETER"]; let armed = null;
  root.innerHTML = `<div class="sim">
    <div class="panel"><div class="eyebrow">Initial seed (ProFuzzBench, Live555)</div><div class="mono" style="margin-top:4px">${seed.join(" → ")}</div></div>
    <div id="se-body"></div>
  </div>`;
  const body = U.$(root, "#se-body");
  const phase1 = () => {
    body.innerHTML = `<div class="stack"><div><b>Step 1.</b> MissingTypes = AllTypes − ExistingTypes. Tap every type that is <b>missing</b> from the seed.</div>
      <div class="chips" id="se-types">${TYPES.map(t => `<button class="chip" data-t="${t}">${t}</button>`).join("")}</div>
      <div class="row"><button class="btn sm" id="se-c1">Check</button><span class="small muted" id="se-r1"></span></div></div>`;
    U.$$(body, "#se-types button").forEach(b => b.onclick = () => { sel.has(b.dataset.t) ? sel.delete(b.dataset.t) : sel.add(b.dataset.t); b.classList.toggle("on"); });
    U.$(body, "#se-c1").onclick = () => {
      const miss = TYPES.filter(t => !seed.includes(t)); const ok = miss.every(t => sel.has(t)) && [...sel].every(t => miss.includes(t));
      U.$(body, "#se-r1").textContent = ok ? "Correct: 6 of 10 types are missing." : "Not yet. The seed contains exactly DESCRIBE, SETUP, PLAY and TEARDOWN.";
      if (ok) { phase = 2; setTimeout(phase2, 700); }
    };
  };
  const simulate = (s) => { let st = "INIT"; const out = []; for (const m of s) { const n = rtspNext(st, m); out.push(n ? `200 (${st}→${n})` : `455 not valid in ${st}`); if (n) st = n; } return out; };
  const phase2 = () => {
    body.innerHTML = `<div class="stack"><div><b>Step 2.</b> ChatAFL adds <b>two missing types at a time</b>, to keep seeds short and diverse. The LLM proposes <b>PAUSE</b> and <b>GET_PARAMETER</b>. Pick a request, then tap the slot where it belongs.</div>
      <div class="row" id="se-pend"></div><div class="seqlist" id="se-seq"></div><div class="panel small" id="se-r2"></div></div>`;
    draw2();
  };
  const draw2 = () => {
    U.$(body, "#se-pend").innerHTML = pending.map(p => `<button class="btn sm ${armed === p ? "on" : ""}" data-p="${p}">${p}</button>`).join("") || `<span class="pill good">both inserted</span>`;
    U.$$(body, "#se-pend button").forEach(b => b.onclick = () => { armed = b.dataset.p; draw2(); });
    const res = simulate(seq);
    let h = `<button class="slot ${armed ? "armed" : ""}" data-k="0">insert here</button>`;
    seq.forEach((m, k) => { h += `<div class="seqitem ${seed.includes(m) ? "" : "new"}"><span>${k + 1}.</span><span>${m}</span><span class="small" style="margin-left:auto;color:${res[k].startsWith("200") ? "var(--cov)" : "var(--bad)"}">${res[k]}</span></div><button class="slot ${armed ? "armed" : ""}" data-k="${k + 1}">insert here</button>`; });
    U.$(body, "#se-seq").innerHTML = h;
    U.$$(body, "#se-seq .slot").forEach(s => s.onclick = () => { if (!armed) return; seq.splice(+s.dataset.k, 0, armed); pending = pending.filter(p => p !== armed); armed = null; draw2(); check(); });
  };
  const check = () => {
    const res = simulate(seq), r = U.$(body, "#se-r2");
    if (pending.length) { r.textContent = "One more to place."; return; }
    if (res.every(x => x.startsWith("200"))) {
      r.innerHTML = `<b>Every request accepted.</b> Your enriched seed now exercises PLAY→READY via PAUSE, a transition the original seeds never reached. This is the ingredient bug #1 needed. The LLM also copies context such as the session ID from the real seed it's given, which fixed the 24.5% session-mismatch failures from the case study.`;
      api.done();
    } else {
      r.innerHTML = `Some requests get <b>455</b>, meaning not valid in that state. Remember PAUSE is only valid in PLAY (or RECORD), and GET_PARAMETER needs a session (READY or later). <button class="btn sm" id="se-retry">Try again</button>`;
      U.$(body, "#se-retry").onclick = () => { seq = seed.slice(); pending = ["PAUSE", "GET_PARAMETER"]; draw2(); r.textContent = ""; };
    }
  };
  phase1();
};

/* =====================================================================
   ChatAFL · Plateau Breaker
   ===================================================================== */
G.plateauBreaker = function (root, api) {
  let maxP = 512, running = false;
  root.innerHTML = `<div class="sim">
    <label class="small" for="pb-max">MaxPlateau = <b id="pb-mv">512</b> uninteresting sequences</label>
    <input type="range" id="pb-max" min="0" max="7" step="1" value="4">
    <canvas id="pb-cv"></canvas>
    <div class="legend"><span><i style="background:var(--muted)"></i>AFLNet (no LLM)</span><span><i style="background:var(--chat)"></i>ChatAFL</span><span><i style="background:var(--warn)"></i>LLM call</span></div>
    <div class="kv panel" id="pb-kv"><span>PlateauLen</span><b>0</b></div>
    <button class="btn primary" id="pb-run">Run 24 simulated hours</button>
    <div class="panel small" id="pb-msg">Same random world for both fuzzers. Only the plateau handler differs.</div>
  </div>`;
  const VALS = [32, 64, 128, 256, 512, 1024, 2048, 8192];
  U.$(root, "#pb-max").oninput = (e) => { maxP = VALS[+e.target.value]; U.$(root, "#pb-mv").textContent = maxP; };
  const sim = (useLLM, seed) => {
    const r = U.rng(seed); const REG = [180, 120, 140, 90, 110, 80, 100, 70]; let unlocked = 1, found = 0, plateau = 0, calls = 0, ineff = 0, maxIneff = Math.floor(maxP / 4);
    const series = [], callsAt = []; const EX = 120000;
    for (let e = 1; e <= EX; e++) {
      const reach = REG.slice(0, unlocked).reduce((a, b) => a + b, 0), unf = reach - found;
      let interesting = false;
      if (r() < 0.03 * Math.pow(unf / reach, 2.2)) { found++; interesting = true; }
      if (unlocked < REG.length && r() < 0.000012) { unlocked++; interesting = true; }
      if (interesting) plateau = 0; else plateau++;
      if (useLLM && plateau > maxP && ineff < maxIneff) {
        calls++; callsAt.push(e);
        if (unlocked < REG.length && r() < 0.75) { unlocked++; plateau = 0; } else { ineff++; plateau = 0; }
      }
      if (e % 1000 === 0) series.push(found);
    }
    return { series, calls, ineff, found, unlocked, callsAt, plateau, maxIneff };
  };
  const draw = (A, C) => {
    const cv = U.$(root, "#pb-cv"), ctx = U.canvas(cv, 180), W = ctx.W, H = ctx.H; ctx.clearRect(0, 0, W, H);
    const max = 900, n = A.series.length; const X = i => 30 + i / (n - 1) * (W - 40), Y = v => H - 20 - v / max * (H - 30);
    ctx.strokeStyle = U.css("--line"); ctx.beginPath(); ctx.moveTo(30, H - 20); ctx.lineTo(W - 10, H - 20); ctx.moveTo(30, 10); ctx.lineTo(30, H - 20); ctx.stroke();
    ctx.fillStyle = U.css("--muted"); ctx.font = "10px " + U.css("--f-mono"); ctx.fillText("0h", 30, H - 6); ctx.fillText("24h", W - 30, H - 6); ctx.fillText("branches", 34, 12);
    ctx.fillStyle = U.css("--warn"); C.callsAt.forEach(e => ctx.fillRect(X(e / 1000 - 1) - 0.5, H - 24, 1.5, 4));
    [[A, "--muted"], [C, "--chat"]].forEach(([S, c]) => { ctx.strokeStyle = U.css(c); ctx.lineWidth = 2; ctx.beginPath(); S.series.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))); ctx.stroke(); });
  };
  U.$(root, "#pb-run").onclick = () => {
    if (running) return; running = true;
    const seed = Math.floor(Math.random() * 1e9);
    const A = sim(false, seed), C = sim(true, seed);
    draw(A, C);
    U.$(root, "#pb-kv").innerHTML = `<span>AFLNet coverage</span><b>${A.found} branches · ${A.unlocked}/8 states</b><span>ChatAFL coverage</span><b>${C.found} branches · ${C.unlocked}/8 states</b><span>LLM calls</span><b>${C.calls} (${C.ineff} ineffective, cap ${C.maxIneff})</b>`;
    let m;
    if (maxP <= 64) m = `MaxPlateau ${maxP} is very small. ChatAFL queries the LLM constantly and burns its ineffective-prompt budget (MaxPlateau/4 = ${C.maxIneff}) early. The paper says too small "would cause ChatAFL to overly query the LLM."`;
    else if (maxP >= 2048) m = `MaxPlateau ${maxP} is large. The fuzzer sits on long plateaus before asking for help: "too large would lead ChatAFL to remain stuck for too long."`;
    else m = `MaxPlateau ${maxP} is a balanced setting. The paper chose 512 by heuristic screening, which is reached in about 10 minutes of real fuzzing.`;
    U.$(root, "#pb-msg").innerHTML = m + " Each orange tick is an LLM call. A successful one moves the server into a new state, which opens new code to cover.";
    running = false; api.done();
  };
};

/* =====================================================================
   ChatAFL · Results Explorer (Tables III, IV, V)
   ===================================================================== */
G.chatResults = function (root, api) {
  const S = ["Live555", "ProFTPD", "PureFTPD", "Kamailio", "Exim", "forked-daapd"];
  const D = {
    transitions: { ChatAFL: [160.0, 246.7, 281.8, 130.0, 108.4, 25.4], AFLNet: [83.8, 172.6, 216.9, 99.9, 62.7, 21.4], NSFuzz: [90.2, 181.2, 206.1, 105.3, 69.5, 20.1], avg: { AFLNet: "47.60%", NSFuzz: "42.69%" }, sp: { AFLNet: "48.12×", NSFuzz: "15.94×" } },
    states: { ChatAFL: [14.2, 28.7, 27.9, 17.0, 19.5, 12.1], AFLNet: [10.0, 22.6, 25.5, 14.0, 14.1, 8.7], NSFuzz: [11.7, 24.3, 24.0, 15.1, 14.4, 8.0], total: [15, 30, 30, 23, 23, 13], avg: { AFLNet: "29.55%", NSFuzz: "25.75%" } },
    branches: { ChatAFL: [2928.4, 5143.3, 1134.3, 10064.0, 3789.4, 2364.8], AFLNet: [2860.2, 4763.0, 1056.3, 9404.1, 3647.6, 2227.1], NSFuzz: [2807.6, 4421.8, 1041.1, 9758.7, 3564.3, 2331.3], avg: { AFLNet: "5.81%", NSFuzz: "6.74%" }, sp: { AFLNet: "6.14×", NSFuzz: "10.18×" } }
  };
  let metric = "transitions", base = "AFLNet";
  root.innerHTML = `<div class="sim">
    <div class="chips" id="cr-m">${Object.keys(D).map(k => `<button class="chip" data-k="${k}">${k}</button>`).join("")}</div>
    <div class="chips" id="cr-b">${["AFLNet", "NSFuzz"].map(k => `<button class="chip" data-k="${k}">vs ${k}</button>`).join("")}</div>
    <div class="row"><span class="pill good" id="cr-avg"></span><span class="pill" id="cr-sp"></span></div>
    <div class="legend"><span><i style="background:var(--chat)"></i>ChatAFL</span><span><i style="background:var(--muted)"></i>baseline</span></div>
    <div class="bars" id="cr-bars"></div>
    <div class="panel small" id="cr-note"></div>
  </div>`;
  const render = () => {
    U.$$(root, "#cr-m button").forEach(b => b.classList.toggle("on", b.dataset.k === metric));
    U.$$(root, "#cr-b button").forEach(b => b.classList.toggle("on", b.dataset.k === base));
    const d = D[metric];
    const max = Math.max(...d.ChatAFL, ...d[base], ...(d.total || []));
    U.$(root, "#cr-avg").textContent = `avg improvement ${d.avg[base]}`;
    U.$(root, "#cr-sp").textContent = d.sp ? `avg speed-up ${d.sp[base]}` : "states: % of reachable";
    U.$(root, "#cr-bars").innerHTML = S.map((s, i) => { const g = U.pct(d.ChatAFL[i], d[base][i]); return `<div class="barrow"><span class="lbl">${s}</span>
      <div class="bartrack"><i style="width:${d.ChatAFL[i] / max * 100}%;background:var(--chat)"></i><i style="width:${d[base][i] / max * 100}%;background:var(--muted)"></i></div>
      <span class="val">${d.total ? `${d.ChatAFL[i]}/${d.total[i]}` : (g >= 0 ? "+" : "") + g.toFixed(1) + "%"}</span></div>`; }).join("");
    const N = { transitions: "Live555 +90.98% transitions over AFLNet, reached 228× sooner. Â12 ≥ 0.86 for all subjects, a substantial advantage.",
      states: "Total = states covered by any tool in any run. ChatAFL averages 14.2 of 15 Live555 states. Kamailio is the weakest (avg 17, max 20 of 23).",
      branches: "Code gains are smaller (2.4–8.0% vs AFLNet) than state gains. Exploring states efficiently is the main win. Branch Â12 ≥ 0.70 everywhere." };
    U.$(root, "#cr-note").textContent = N[metric];
  };
  U.$$(root, "#cr-m button").forEach(b => b.onclick = () => { metric = b.dataset.k; render(); api.done(); });
  U.$$(root, "#cr-b button").forEach(b => b.onclick = () => { base = b.dataset.k; render(); });
  render();
  setTimeout(() => api.done(), 4000);
};
})();
