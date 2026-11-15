(function () {
const U = FL.U, G = FL.GAMES;

/* =====================================================================
   Fuzz4All · Autoprompt Arena
   ===================================================================== */
G.autoprompt = function (root, api) {
  const C = [
    { id: "P1", how: "greedy · temperature 0", score: 19, dup: 4, inval: 7,
      text: "The C++23 std::expected class template provides a way to store either an expected value of type T or an unexpected value of type E. It is useful for handling functions that may return an error or a valid result… Observers like operator bool and has_value… Monadic operations like and_then, transform, or_else, and transform_error allow chaining operations on expected values…",
      why: "Concise, covers construction, observers, monadic chaining and modifiers. This is the text from the paper's Figure 2." },
    { id: "P2", how: "sampled · temperature 1", score: 9, dup: 15, inval: 6,
      text: "std::expected is a C++ type that holds a value or an error.",
      why: "Too thin. StarCoder writes the same trivial snippet again and again, so duplicates aren't counted." },
    { id: "P3", how: "sampled · temperature 1", score: 7, dup: 3, inval: 20,
      text: "Defined in header <expected>. template< class T, class E > class expected; (since C++23) | Member types: value_type T, error_type E, unexpected_type std::unexpected<E> | rebind… (1) (2) (3) Notes: Feature-test macro __cpp_lib_expected 202202L…",
      why: "Basically the raw documentation: tables, numbering, macros. The paper's ablation shows the raw prompt lowers validity because the model struggles with it." },
    { id: "P4", how: "sampled · temperature 1", score: 12, dup: 5, inval: 13,
      text: "std::expected works like std::optional but can also hold an error. Use value() to access, has_value() to check, and std::make_expected to create one…",
      why: "Partly hallucinated: std::make_expected doesn't exist in the standard, so many generated programs fail to compile." }
  ];
  let guess = null;
  root.innerHTML = `<div class="sim">
    <div class="panel small"><div class="eyebrow">User input</div>cppreference page for <code>std::expected</code> (C++23): 498 words, 3,262 characters, tables and repeated per-function descriptions.<br><span class="muted">APInstruction: "Please summarize the above information in a concise manner to describe the usage and functionality of the target"</span></div>
    <div class="stack" id="ap-c">${C.map(c => `<button class="opt" data-id="${c.id}"><b>${c.id}</b> <span class="muted small">(${c.how})</span><br><span class="small">${U.esc(c.text)}</span></button>`).join("")}</div>
    <button class="btn primary" id="ap-run" disabled>Score all 4: generate 30 snippets each</button>
    <div id="ap-res"></div>
  </div>`;
  U.$$(root, "#ap-c .opt").forEach(b => b.onclick = () => { guess = b.dataset.id; U.$$(root, "#ap-c .opt").forEach(x => x.style.borderColor = x === b ? "var(--f4a)" : ""); U.$(root, "#ap-run").disabled = false; });
  U.$(root, "#ap-run").onclick = async () => {
    U.$(root, "#ap-run").disabled = true;
    const res = U.$(root, "#ap-res"); res.innerHTML = "";
    for (const c of C) {
      const cells = []; for (let i = 0; i < c.score; i++) cells.push("v"); for (let i = 0; i < c.dup; i++) cells.push("d"); for (let i = 0; i < c.inval; i++) cells.push("x");
      cells.sort(() => Math.random() - .5);
      const row = U.el(`<div class="panel" style="margin-top:8px"><div class="row" style="justify-content:space-between"><b>${c.id}</b><span class="pill" data-s>score 0</span></div><div class="row" style="gap:3px;margin-top:6px" data-g></div></div>`);
      res.appendChild(row); let s = 0;
      for (const k of cells) {
        await U.sleep(18);
        U.$(row, "[data-g]").insertAdjacentHTML("beforeend", `<span title="${k === "v" ? "valid & unique" : k === "d" ? "duplicate" : "invalid"}" style="width:11px;height:11px;border-radius:3px;display:inline-block;background:${k === "v" ? "var(--cov)" : k === "d" ? "var(--warn)" : "var(--line)"}"></span>`);
        if (k === "v") { s++; U.$(row, "[data-s]").textContent = "score " + s; }
      }
    }
    const best = C.reduce((a, b) => a.score > b.score ? a : b);
    res.insertAdjacentHTML("beforeend", `<div class="callout" style="margin-top:10px"><b>${best.id} wins with ${best.score} valid unique snippets.</b> ${guess === best.id ? "You called it." : `You picked ${guess}.`}
      <ul style="margin-top:6px">${C.map(c => `<li><b>${c.id}</b>: ${c.why}</li>`).join("")}</ul>
      <div class="legend" style="margin-top:6px"><span><i style="background:var(--cov)"></i>valid & unique (counts)</span><span><i style="background:var(--warn)"></i>duplicate</span><span><i style="background:var(--line)"></i>invalid</span></div>
      <p class="small muted" style="margin-top:6px">Scores here are illustrative. The procedure is the paper's: 4 candidates (1 greedy + 3 sampled), 30 snippets each, score = Σ isValid. In the paper autoprompting averaged about 2.3 minutes per campaign.</p></div>`);
    api.done();
  };
};

/* =====================================================================
   Fuzz4All · Fuzzing loop (SMT, modeled on Figure 3)
   ===================================================================== */
G.fuzzLoop = function (root, api) {
  const S0 = `(declare-const x1 Real)\n(assert (! (= x1 1)))\n(check-sat)`;
  const S1 = `(declare-const x1 Int)\n(declare-const x2 Int)\n(assert (! (= x1 1)))\n(assert (= x2 (* x1 3)))\n(check-sat)`;
  const S2 = `(declare-const x1 Int)\n(declare-const x2 Int)\n(assert (! (= x1 1) :named a1))\n(assert (= x2 (* x1 3)))\n(check-sat)`;
  const POOL_NEW = [
    `(declare-fun f (Int) Int)\n(assert (forall ((y Int)) (> (f y) y)))\n(check-sat)`,
    `(declare-const s String)\n(assert (str.in_re s (re.+ (str.to_re "ab"))))\n(check-sat)`,
    `(declare-const a (Array Int Int))\n(assert (= (select a 0) 5))\n(check-sat)`,
    `(declare-const b (_ BitVec 8))\n(assert (bvult b #x10))\n(check-sat)`
  ];
  let example = null, lineage = [], cov = 0, iter = 0, done = false, validInputs = [];
  root.innerHTML = `<div class="sim">
    <div class="panel small"><b>Input prompt</b> (from autoprompting): overview of the SMT2 language and SMT solvers. <b>SUT</b>: an SMT solver (the paper fuzzes Z3 and CVC5). <b>Oracle</b>: crash or internal assertion failure.</div>
    <div class="row"><span class="pill" id="fl-it">iteration 0</span><span class="pill good" id="fl-cov">coverage +0</span></div>
    <div class="eyebrow">Example in the prompt</div>
    <div class="codeblock" id="fl-ex">(none yet, so the first call must use generate-new)</div>
    <div class="eyebrow">Generation strategy</div>
    <div class="grid2" id="fl-st">
      <button class="btn" data-s="new">generate-new</button>
      <button class="btn" data-s="mut">mutate-existing</button>
      <button class="btn" data-s="eq">semantic-equiv</button>
      <button class="btn ghost" data-s="pick">pick another example</button>
    </div>
    <div class="eyebrow">StarCoder output (1 of a batch of 30)</div>
    <div class="codeblock" id="fl-out"></div>
    <div class="log" id="fl-log"></div>
  </div>`;
  const L = (h) => { const lg = U.$(root, "#fl-log"); lg.insertAdjacentHTML("beforeend", h + "\n"); lg.scrollTop = lg.scrollHeight; };
  const set = (code) => { U.$(root, "#fl-out").textContent = code; };
  const render = () => {
    U.$(root, "#fl-it").textContent = `iteration ${iter}`; U.$(root, "#fl-cov").textContent = `coverage +${cov} lines`;
    U.$(root, "#fl-ex").textContent = example || "(none yet, so the first call must use generate-new)";
    U.$$(root, "#fl-st button").forEach(b => b.disabled = done || (!example && b.dataset.s !== "new"));
  };
  const go = (s) => {
    if (done) return;
    if (s === "pick") { if (validInputs.length > 1) { example = U.pick(validInputs.filter(v => v !== example)) || example; lineage = [example === S0 ? "new0" : "other"]; L(`<span class="dim">Picked a different valid example from the last batch.</span>`); } render(); return; }
    iter++; let out, note;
    if (s === "new") {
      out = iter === 1 ? S0 : U.pick(POOL_NEW); lineage = [out === S0 ? "new0" : "other"];
      note = `generate-new: "Please create a program which uses complex SMT2 logic for an SMT solver"`; cov += U.ri(40, 90);
    } else if (s === "mut") {
      if (example === S0) { out = S1; lineage.push("mut"); note = "mutate-existing: the type of x1 changed from Real to Int and a computation was added (as in Fig. 3, step 2)"; cov += 55; }
      else { out = example.replace(/Int/g, "Real").replace("5", "7"); lineage.push("mut"); note = "mutate-existing: types and constants changed"; cov += U.ri(5, 30); }
    } else {
      if (example === S1) { out = S2; lineage.push("eq"); note = "semantic-equiv: same meaning, but a :named annotation was added (Fig. 3, step 3)"; }
      else { out = example.replace("(check-sat)", "(push 1)\n(check-sat)\n(pop 1)"); lineage.push("eq"); note = "semantic-equiv: wrapped in push/pop, same semantics"; cov += U.ri(2, 15); }
    }
    set(out); L(`#${iter} ${note}`);
    if (out === S2) {
      done = true;
      L(`<span class="bad">ORACLE: the SMT solver crashed (unexpected internal error on the tagged assertion)</span>`);
      L(`<span class="good">That's Figure 3's chain: generate-new → mutate-existing → semantic-equiv exposed a real SMT-solver bug, confirmed and fixed by the developers. No single strategy found it alone.</span>`);
      api.done();
    } else {
      L(`<span class="dim">Oracle: SAT/UNSAT returned, so the input is valid and is added to the pool of examples.</span>`);
      example = out; validInputs.push(out);
      if (iter >= 8 && !done) { L(`<span class="warn">Hint: try generate-new, then mutate-existing on that output, then semantic-equiv.</span>`); }
    }
    render();
  };
  U.$$(root, "#fl-st button").forEach(b => b.onclick = () => go(b.dataset.s));
  set(""); render();
  L(`<span class="dim">The snippets here are modeled on the paper's Figure 3 example. The real loop samples the example and the strategy at random. Here you choose them.</span>`);
};

/* =====================================================================
   Fuzz4All · Results Explorer (Table 2)
   ===================================================================== */
G.f4aResults = function (root, api) {
  const T = [
    { t: "GCC", base: "GrayC", bp: 104326, bv: 95.96, bc: 167453, fp: 44324, fv: 37.26, fc: 198927, g: "+18.8%" },
    { t: "G++", base: "YARPGen", bp: 255581, bv: 99.99, bc: 166614, fp: 26365, fv: 40.74, fc: 210743, g: "+26.5%" },
    { t: "CVC5", base: "TypeFuzz", bp: 43001, bv: 93.24, bc: 46174, fp: 36054, fv: 47.63, fc: 57674, g: "+24.9%" },
    { t: "Go", base: "go-fuzz", bp: 20002, bv: 100.0, bc: 38024, fp: 22817, fv: 23.02, fc: 43317, g: "+13.7%" },
    { t: "javac", base: "Hephaestus", bp: 728217, bv: 57.22, bc: 10285, fp: 31967, fv: 49.05, fc: 16552, g: "+60.9%" },
    { t: "Qiskit", base: "MorphQ", bp: 38474, bv: 100.0, bc: 19929, fp: 33454, fv: 24.9, fc: 34988, g: "+75.6%" }
  ];
  let m = "cov";
  root.innerHTML = `<div class="sim">
    <div class="chips" id="fr-m"><button class="chip" data-m="cov">Coverage</button><button class="chip" data-m="val">% valid</button><button class="chip" data-m="num"># programs</button></div>
    <div class="legend"><span><i style="background:var(--f4a)"></i>Fuzz4All</span><span><i style="background:var(--muted)"></i>best baseline</span></div>
    <div class="bars" id="fr-b"></div>
    <div class="panel small" id="fr-n"></div>
  </div>`;
  const render = () => {
    U.$$(root, "#fr-m button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    U.$(root, "#fr-b").innerHTML = T.map(r => {
      const [a, b] = m === "cov" ? [r.fc, r.bc] : m === "val" ? [r.fv, r.bv] : [r.fp, r.bp];
      const mx = m === "val" ? 100 : Math.max(a, b);
      const lab = m === "cov" ? r.g : m === "val" ? `${r.fv}% vs ${r.bv}%` : `${U.fmt(r.fp)}`;
      return `<div class="barrow" style="grid-template-columns:70px 1fr 92px"><span class="lbl">${r.t}</span><div class="bartrack"><i style="width:${a / mx * 100}%;background:var(--f4a)"></i><i style="width:${b / mx * 100}%;background:var(--muted)"></i></div><span class="val small">${lab}</span></div>`;
    }).join("");
    U.$(root, "#fr-n").innerHTML = {
      cov: "Fuzz4All has the highest final line coverage on every target, all statistically significant (*). Average +36.8% over the best baseline. Generators like YARPGen and MorphQ are beaten almost immediately. Mutators like GrayC and go-fuzz start fast with good seeds and then flatten.",
      val: "Validity is much lower: a 56.0% average reduction. Go is strict, since unused variables are errors. Qiskit is low because quantum code is rare in training data. Hephaestus is lowish on purpose, because it generates ill-typed programs.",
      num: "Fewer programs: 43.0% fewer on average, because LLM inference on a GPU is the bottleneck. Fewer, less valid, but far more diverse inputs still win on coverage."
    }[m];
  };
  U.$$(root, "#fr-m button").forEach(b => b.onclick = () => { m = b.dataset.m; render(); api.done(); });
  render(); setTimeout(() => api.done(), 4000);
};

/* =====================================================================
   Fuzz4All · Bug Museum (Figure 5)
   ===================================================================== */
G.bugMuseum = function (root, api) {
  const B = [
    { t: "GCC: internal compiler error (segfault)", code: `#include <optional>\nvoid y(std::optional<int> z)\n    noexcept(noexcept(std::optional<int>{z})) {}`,
      what: "Valid C++ that should compile. noexcept(x) marks a function non-throwing if x is true. The nested noexcept over a std::optional construction crashed GCC.",
      miss: "Prior techniques simply don't support the noexcept feature.", st: "Confirmed and fixed. GCC developers added a modified version of the snippet to GCC's official test suite." },
    { t: "Clang: segmentation fault", code: `#include <iostream>\nusing E = std::numeric_limits<int>;\nauto fail(E e) -> decltype(throw e, void()) {\n    throw e;\n}`,
      what: "Invalid code. A throw inside decltype in a trailing return type is evaluated first, skips the return-type evaluation, and crashes the Clang frontend.",
      miss: "Prior fuzzers mostly generate valid code only, and decltype is especially hard to model.", st: "Confirmed by developers. A near-valid input found a bug in the validation logic." },
    { t: "Go: segmentation violation", code: `package main\nimport "runtime"\nfunc main() { runtime.ReadMemStats(nil) }`,
      what: "Passing nil causes a segfault instead of a useful error message.",
      miss: "go-fuzz needs hand-written templates per library, and runtime isn't covered by any. Fuzz4All targeted it just by being given the runtime docs.", st: "Confirmed and fixed." },
    { t: "Qiskit: crash on QASM round trip", code: `from qiskit import QuantumCircuit, ClassicalRegister\ncrz = ClassicalRegister(1, name="crz")\nqc = QuantumCircuit(crz)\nqc.qasm(filename="my.qasm")\nQuantumCircuit.from_qasm_file("my.qasm")`,
      what: "The exporter uses the register's name as its QASM identifier. 'crz' is also a QASM operation, so the exported file is ambiguous and crashes on re-import.",
      miss: "MorphQ's templates only use anonymous registers. The LLM's domain knowledge produced a meaningful name that happens to collide.", st: "Found by the export/import oracle." }
  ];
  const seen = new Set();
  root.innerHTML = `<div class="sim"><div class="row"><span class="pill" style="white-space:normal">98 bugs · 64 confirmed new · 26 confirmed known · 6 pending · 2 won't fix</span></div>
    <div class="scrollx"><table class="data"><tr><th>SUT</th><th class="num">Total</th><th class="num">New</th><th class="num">Known</th></tr>
    ${[["GCC", 30, 14, 11], ["Clang", 27, 18, 9], ["CVC5", 9, 7, 2], ["Z3", 14, 12, 0], ["Go", 4, 2, 2], ["Java", 3, 3, 0], ["Qiskit", 11, 8, 2]].map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join("")}</table></div>
    <div class="stack" id="bm">${B.map((b, i) => `<div class="card flat"><button class="btn sm" data-i="${i}" style="width:100%;justify-content:space-between"><span>${b.t}</span><span>Open</span></button><div data-d="${i}" hidden style="margin-top:10px" class="stack"><div class="codeblock">${U.esc(b.code)}</div><p><b>What happened.</b> ${b.what}</p><p><b>Why others missed it.</b> ${b.miss}</p><p class="muted"><b>Status.</b> ${b.st}</p></div></div>`).join("")}</div></div>`;
  U.$$(root, "#bm button").forEach(b => b.onclick = () => { const d = U.$(root, `[data-d="${b.dataset.i}"]`); d.hidden = !d.hidden; seen.add(b.dataset.i); if (seen.size === 4) api.done(); });
};

/* =====================================================================
   FINALE · Comparison Matrix
   ===================================================================== */
G.compareMatrix = function (root, api) {
  const D = [
    ["Venue", "ACM CCS 2024", "NDSS 2024", "ICSE 2024"],
    ["Target", "General C/C++ programs (file parsers, libraries)", "Stateful network protocol servers (text-based)", "Systems that take code as input: compilers, SMT solvers, Go, javac, Qiskit"],
    ["Core question", "How should the scheduler and mutator jointly pick and change seeds?", "How do we know message structure, order and states without a machine-readable spec?", "How do we fuzz any language and any feature without building a new fuzzer?"],
    ["Where the intelligence lives", "Mathematics inside the loop: stochastic control and Newton steps", "LLM next to the loop: grammars, seeds, next-message hints", "LLM as the loop: it generates and mutates every input"],
    ["Role of an LLM", "None", "gpt-3.5-turbo: grammar extraction, seed enrichment, plateau breaking", "GPT-4 distills prompts, StarCoder generates inputs"],
    ["Feedback used", "Edge coverage + branch distance on frontier branches", "Code (branch) + state coverage (response codes)", "Validity during autoprompting. The loop itself uses no coverage feedback"],
    ["Built on", "AFL++ (LLVM instrumentation, havoc)", "AFLNet", "New, about 872 LoC of Python"],
    ["Instrumentation", "Required (CFG + CMP hooks)", "Required (AFLNet's coverage)", "Not required"],
    ["Key mechanisms", "Frontier branches, Table 1 branch distance, PT/TT/SC greedy scheduler, local search + Newton, hot bytes", "Few-shot + self-consistency grammars, MissingTypes enrichment, PlateauLen > MaxPlateau → ChatNextMessage", "Autoprompting (greedy + sampled, validity scoring), loop with example + 3 strategies"],
    ["Theory", "Theorem 1: greedy optimality (exchange argument)", "Empirical case study motivates the design", "Empirical. Autoprompting without gradients"],
    ["Benchmarks", "23 FuzzBench + 15 standalone (38), Magma (17)", "ProFuzzBench: 6 text-protocol servers", "9 SUTs, 6 languages"],
    ["Trials", "10 × 24h (5 × 24h Magma), > 6 CPU-years", "10 × 24h", "5 × 24h; 10k-input runs for RQ2/RQ3"],
    ["Statistics", "Mann-Whitney U", "Vargha-Delaney Â12", "Mann-Whitney U"],
    ["Headline", "+26.45% edges vs AFL++ (standalone), +6.59% FuzzBench, −58.20% control space", "+47.60% transitions, +29.55% states, +5.81% branches vs AFLNet", "+36.8% line coverage over best baselines"],
    ["Bugs", "FOX+D: 20 unique, 8 previously unknown (xpdf)", "9 zero-days (7 confirmed, 3 fixed), vs 3 and 4 for the baselines", "98 bugs, 64 confirmed new"],
    ["Main limitation", "Non-convex branches, floats, var-var strings, estimate accuracy", "Needs public specs in LLM training data, text protocols only, LLM cost", "Lower validity, GPU throughput, data shift, hallucination, crash-only oracles"]
  ];
  let i = 3;
  root.innerHTML = `<div class="sim"><div class="chips" id="cm-c">${D.map((d, k) => `<button class="chip" data-k="${k}">${d[0]}</button>`).join("")}</div><div class="stack" id="cm-o"></div></div>`;
  const render = () => {
    U.$$(root, "#cm-c button").forEach(b => b.classList.toggle("on", +b.dataset.k === i));
    const [dim, a, b, c] = D[i];
    U.$(root, "#cm-o").innerHTML = [["FOX", a, "var(--fox)"], ["ChatAFL", b, "var(--chat)"], ["Fuzz4All", c, "var(--f4a)"]].map(([n, t, col]) =>
      `<div class="card flat" style="border-left:5px solid ${col}"><div class="eyebrow" style="color:${col}">${n} · ${dim}</div><p style="margin-top:4px">${t}</p></div>`).join("");
  };
  U.$$(root, "#cm-c button").forEach(b => b.onclick = () => { i = +b.dataset.k; render(); api.done(); });
  render();
};

/* =====================================================================
   FINALE · Which paper said it?
   ===================================================================== */
G.paperSorter = function (root, api) {
  const S = [
    ["Coverage-increasing inputs become increasingly rare, so schedulers degenerate into round-robin.", 0],
    ["The same input executed twice might give different outputs every time.", 1],
    ["Csmith was not able to uncover any new bugs in the latest GCC and Clang over six months.", 2],
    ["We treat strcmp as a sequence of single-byte integer comparisons.", 0],
    ["Two authors spent a total of 8 hours reading RFC 2326.", 1],
    ["The distillation LLM is GPT-4 and the generation LLM is StarCoder.", 2],
    ["The scheduler estimates productive time over total time per frontier branch.", 0],
    ["We set MaxPlateau to 512 non-coverage-increasing message sequences.", 1],
    ["Our scoring function counts unique generated code snippets that are valid.", 2],
    ["Control space reduced by 58.20% during a 24-hour campaign.", 0],
    ["A temperature of 1.5 is used to break out of the coverage plateau.", 1],
    ["Targeted fuzzing reaches an average hit rate of 83.0%.", 2],
    ["A greedy schedule maximizing expected coverage gain at each stage is optimal.", 0],
    ["Session IDs are assigned dynamically by the server, so the LLM cannot guess them.", 1],
    ["semantic-equiv asks for a semantically equivalent program to the previous generation.", 2],
    ["Midpoint convexity checks estimate whether a branch is convex.", 0],
    ["We delegate the question of what states are to the LLM.", 1],
    ["The approach does not require any instrumentation of the SUT.", 2],
    ["Hot byte locations are inferred from adjacency.", 0],
    ["A bug needs SETUP, PLAY, PAUSE, PLAY in that order.", 1],
    ["The Qiskit oracle re-imports a circuit exported to QASM.", 2]
  ].sort(() => Math.random() - .5);
  const N = ["FOX", "ChatAFL", "Fuzz4All"]; let k = 0, score = 0;
  root.innerHTML = `<div class="sim"><div class="row"><span class="pill" id="ps-p"></span><span class="pill good" id="ps-s"></span></div>
    <div class="card flat sorter-stmt" id="ps-q"></div>
    <div class="grid2" style="grid-template-columns:repeat(3,1fr)">${N.map((n, i) => `<button class="btn" data-i="${i}" style="border-color:${["var(--fox)", "var(--chat)", "var(--f4a)"][i]}">${n}</button>`).join("")}</div>
    <div class="panel small" id="ps-f">Tap the paper this comes from.</div></div>`;
  const render = () => {
    U.$(root, "#ps-p").textContent = `${Math.min(k + 1, S.length)}/${S.length}`; U.$(root, "#ps-s").textContent = `score ${score}`;
    U.$(root, "#ps-q").textContent = k < S.length ? `“${S[k][0]}”` : `Done: ${score}/${S.length}. ${score >= 18 ? "Examiner-proof." : "Replay to lock it in."}`;
  };
  U.$$(root, ".grid2 button").forEach(b => b.onclick = () => {
    if (k >= S.length) return;
    const ok = +b.dataset.i === S[k][1]; if (ok) score++;
    U.$(root, "#ps-f").innerHTML = ok ? `<span style="color:var(--cov)">Correct: ${N[S[k][1]]}.</span>` : `<span style="color:var(--bad)">That one is ${N[S[k][1]]}.</span>`;
    k++; render(); if (k === S.length) api.done();
  });
  render();
};
})();
