window.FL = window.FL || {};
FL.CHAPTERS = FL.CHAPTERS || [];

/* ======================================================================
   PROLOGUE: BOOTCAMP
   ====================================================================== */
FL.CHAPTERS.push({
  id: "boot", num: "0", color: "var(--boot)", title: "Bootcamp", venue: "Fuzzing 101",
  blurb: "Learn the vocabulary every examiner expects: seeds, mutation, coverage, oracles and how fuzzers are evaluated.",
  steps: [
    { id: "b-welcome", type: "scene", title: "Day one at the lab",
      setting: "A security research lab, 9:02 a.m. Three PDFs on your desk.",
      lines: [
        { who: "narr", text: "You arrive for your first day. Ada, the lab's guide, has printed three papers and stacked them by your keyboard." },
        { who: "ada", text: "Welcome. These three papers are your world for the next weeks: FOX from CCS 2024, ChatAFL from NDSS 2024, and Fuzz4All from ICSE 2024." },
        { who: "me", text: "They're all about… fuzzing?" },
        { who: "ada", text: "All three. Each one attacks a different weakness of today's fuzzers. FOX makes the core loop smarter with control theory. ChatAFL uses an LLM to understand network protocols. Fuzz4All uses an LLM to write test programs in any language." },
        { who: "ada", text: "Before you meet the researchers, you need their vocabulary. If you can explain these words cleanly, the doctor's questions stop being scary." },
        { who: "me", text: "Then let's break some things on purpose." }
      ] },

    { id: "b-what", type: "lesson", title: "What fuzzing actually is",
      html: `
<p><span class="t" data-g="fuzzing">Fuzzing</span> is automated testing: you generate a huge number of inputs, run each one against the target program, and watch for unexpected behaviour. FOX defines it as <em>"generating random test inputs and executing them against the target program."</em></p>
<p>The program being tested is the <span class="t" data-g="sut">SUT</span>, the system under test. The rule that says "this run is a bug" is the <span class="t" data-g="oracle">oracle</span>. The simplest oracle is a crash. Real campaigns also compile the target with <span class="t" data-g="asan">AddressSanitizer</span>, which turns silent memory corruption into a loud crash with a stack trace.</p>
<h4>Why security people care</h4>
<p>Many crashes are memory-safety bugs: <span class="t" data-g="uaf">use-after-free</span>, <span class="t" data-g="bof">buffer overflows</span>, <span class="t" data-g="null-deref">NULL dereferences</span>. An attacker who controls the input can sometimes turn one into <span class="t" data-g="rce">remote code execution</span>. Fuzzing finds these bugs before attackers do.</p>
<h4>How much the fuzzer can see</h4>
<ul>
<li><span class="t" data-g="blackbox">Blackbox</span>: sees only outputs. Fuzz4All needs no instrumentation of the SUT.</li>
<li><span class="t" data-g="greybox">Greybox</span>: gets cheap coverage feedback from compiled-in <span class="t" data-g="instrumentation">instrumentation</span>. AFL++, FOX, AFLNet and ChatAFL work this way.</li>
<li><span class="t" data-g="whitebox">Whitebox</span>: heavy analysis such as symbolic execution or taint tracking. Precise, but slow.</li>
</ul>
<div class="callout say">"Fuzzing is automated, large-scale input generation with an oracle such as crashes or sanitizer reports. Greybox fuzzers use coverage feedback to decide which inputs are worth keeping."</div>` },

    { id: "b-two", type: "lesson", title: "Two families: mutate or generate",
      html: `
<p>Every fuzzer in these papers belongs to one of two families, or mixes them.</p>
<div class="grid2 collapse">
 <div class="callout"><b>Mutation-based</b><br>Start from <span class="t" data-g="seed">seeds</span> (real inputs), apply small <span class="t" data-g="mutation">mutations</span> such as bit flips, byte swaps or splicing. Needs no spec. Limited by seed quality and by how dumb the mutations are.<br><span class="small muted">AFL++, AFLNet, NSFuzz, GrayC, FOX, ChatAFL</span></div>
 <div class="callout"><b>Generation-based</b><br>Build inputs from scratch using a grammar or a hand-written model. Inputs are valid, but someone has to write and maintain the generator.<br><span class="small muted">Csmith (more than 80k LoC), YARPGen, Peach, BooFuzz</span></div>
</div>
<p>AFL++ has a stage called <span class="t" data-g="havoc">havoc</span>, which stacks several random mutations at once. Remember that word, because FOX reuses havoc inside its local search.</p>
<div class="callout trap">Don't say "Fuzz4All is mutation-based" or "generation-based" alone. Its loop does both: the <em>generate-new</em> strategy acts like a generator, and <em>mutate-existing</em> and <em>semantic-equiv</em> act like mutators. The LLM is the engine for both.</div>` },

    { id: "b-lab", type: "sim", title: "Mutation Lab", game: "mutationLab",
      intro: "A tiny parser crashes only on input that starts with \"BUG!\". Try to reach it by hand, then let the fuzzer run, first blind and then coverage-guided. Watch how keeping 'interesting' inputs changes everything." },

    { id: "b-cov", type: "lesson", title: "Coverage: the fuzzer's sense of smell",
      html: `
<p>A program is a <span class="t" data-g="cfg">control-flow graph</span>. Nodes are <span class="t" data-g="basic-block">basic blocks</span> (straight-line code) and edges are the jumps between them. Instrumentation marks every edge an input executes in a shared-memory <span class="t" data-g="bitmap">bitmap</span>.</p>
<p><span class="t" data-g="coverage-guided">Coverage-guided fuzzing</span> keeps any mutant that lights up a new edge. That is why the guided run in the Mutation Lab cracks "BUG!" quickly and the blind run doesn't: each correct byte is rewarded as soon as it appears.</p>
<div class="kv panel">
 <span>Edge coverage</span><b>FOX reports "edges found"</b>
 <span>Branch coverage</span><b>ChatAFL (via ProFuzzBench tools)</b>
 <span>Line coverage</span><b>Fuzz4All (uniform across languages)</b>
 <span>State coverage</span><b>ChatAFL: unique server response codes</b>
</div>
<p>Coverage is a <em>proxy</em>. You can't find a bug in code you never ran. FOX cites a strong link between coverage and bugs and measures a Pearson correlation of <b>0.88</b> between edges and unique crashes on xpdf. ChatAFL states directly that "coverage is only a proxy measure for the bug-finding ability," which is why every paper also counts real bugs.</p>
<p>Eventually the fuzzer stops finding anything new. That is a <span class="t" data-g="plateau">coverage plateau</span>. ChatAFL calls an LLM when it hits one.</p>` },

    { id: "b-loop", type: "lesson", title: "Inside the loop: scheduler, mutator, energy",
      html: `
<p>Zoom into one iteration of a greybox fuzzer:</p>
<ol>
<li><b><span class="t" data-g="scheduler">Scheduler</span></b>: which seed from the <span class="t" data-g="corpus">corpus</span> do I mutate next?</li>
<li><b><span class="t" data-g="energy">Energy</span></b>: how many mutants do I make from it?</li>
<li><b>Mutator</b>: how exactly do I change it?</li>
<li><b>Execute + feedback</b>: did it crash? Did it reach new coverage? If so, add it to the corpus.</li>
</ol>
<p>Two AFL++ add-ons show up again and again as baselines:</p>
<ul>
<li><span class="t" data-g="cmplog">cmplog</span> (AFLPP+C): reads the operands of comparisons and copies magic values into the input. It is the industry version of <span class="t" data-g="redqueen">REDQUEEN</span>.</li>
<li><span class="t" data-g="dictionary">Dictionary</span> (+D): a list of constants and tokens the mutator may insert. AFLPP+CD (cmplog plus dictionary) is AFL++'s strongest setting.</li>
</ul>
<div class="callout story">FOX argues these four pieces usually act like strangers. The scheduler and the mutator have "distinct objectives and little information exchange" even though both want the same thing: new coverage. Fixing that is the heart of Chapter 1.</div>` },

    { id: "b-eval", type: "lesson", title: "How researchers prove a fuzzer is better",
      html: `
<p>Fuzzing is random, so one lucky run proves nothing. All three papers follow the <span class="t" data-g="klees">Klees et al.</span> playbook:</p>
<ul>
<li><b>Repeat</b>: FOX 10 × 24h per fuzzer and program (more than 6 CPU-years in total). ChatAFL 10 × 24h. Fuzz4All 5 × 24h.</li>
<li><b>Test significance</b>: the <span class="t" data-g="mwu">Mann-Whitney U test</span> (non-parametric, p &lt; 0.05). ChatAFL also reports the effect size <span class="t" data-g="a12">Â12</span>.</li>
<li><b>Benchmarks</b>: <span class="t" data-g="fuzzbench">FuzzBench</span> (coverage), <span class="t" data-g="magma">Magma</span> (known injected bugs), <span class="t" data-g="profuzzbench">ProFuzzBench</span> (protocol servers).</li>
<li><b><span class="t" data-g="ablation">Ablation</span></b>: switch components off to show each one matters.</li>
<li><b>Real bugs</b>: <span class="t" data-g="crash-dedup">deduplicate crashes</span>, confirm with developers, request a <span class="t" data-g="cve">CVE</span>, and follow <span class="t" data-g="responsible-disclosure">responsible disclosure</span>.</li>
</ul>
<div class="callout say">"Mann-Whitney U is used because fuzzing results aren't normally distributed. It's non-parametric and makes no distribution assumption. Â12 tells you how likely a random run of tool A beats a random run of tool B."</div>` },

    { id: "b-bugs", type: "lesson", title: "The bug zoo you'll meet",
      html: `
<div class="scrollx"><table class="data">
<tr><th>Bug class</th><th>CWE</th><th>Who found it here</th></tr>
<tr><td>Use-after-free</td><td>416</td><td>FOX+D (2), ChatAFL (Live555 PLAY, SETUP, sendDataOverTCP)</td></tr>
<tr><td>Invalid free</td><td>761</td><td>FOX+D (3)</td></tr>
<tr><td>Reachable assertion</td><td>617</td><td>FOX+D (12), Fuzz4All (compiler assertions)</td></tr>
<tr><td>Infinite loop</td><td>835</td><td>FOX+D (1)</td></tr>
<tr><td>NULL dereference</td><td>476</td><td>FOX+D (2), Fuzz4All (Go nil)</td></tr>
<tr><td>Heap buffer overflow</td><td>122</td><td>ChatAFL (Live555 stream, ProFTPD commands)</td></tr>
<tr><td>Use-after-return</td><td>562</td><td>ChatAFL (Live555 DESCRIBE, SETUP)</td></tr>
<tr><td>Memory leak</td><td>401</td><td>ChatAFL (Live555, Kamailio)</td></tr>
<tr><td>Internal compiler error</td><td>n/a</td><td>Fuzz4All (GCC, Clang)</td></tr>
</table></div>
<p class="small muted">The CWE numbers for the first five come from FOX's paper. The others are the standard CWE IDs for those bug classes.</p>` },

    { id: "b-quiz", type: "quiz", title: "Bootcamp checkpoint",
      qs: [
        { q: "What makes a fuzzer 'greybox'?", options: ["It reads the source code and solves constraints", "It uses lightweight runtime feedback such as edge coverage from instrumentation", "It only sees the program's outputs", "It uses a GPU"], a: 1, why: "Greybox means cheap feedback such as coverage bitmaps, with no heavy analysis. Whitebox uses symbolic execution or taint. Blackbox sees outputs only." },
        { q: "In coverage-guided fuzzing, when is a mutant added to the corpus?", options: ["Always", "When it crashes", "When it reaches coverage no previous input reached", "When it is shorter than the seed"], a: 2, why: "New coverage makes an input 'interesting'. Crashes are saved separately as bug reports." },
        { q: "Why do fuzzing papers use the Mann-Whitney U test?", options: ["It is the fastest test", "Fuzzing results are random and not normally distributed, and MWU is non-parametric", "It measures code coverage", "Reviewers require t-tests"], a: 1, why: "FOX: 'Since this test is non-parametric and therefore does not make any assumptions about the underlying distribution, it has been widely used… for testing randomized algorithms and fuzzers.'" },
        { q: "AFL++ 'cmplog' mode is an industry implementation of…", options: ["NEUZZ", "REDQUEEN (input-to-state correspondence)", "Angora", "KLEE"], a: 1, why: "FOX: AFLPP+C is 'an industry implementation of REDQUEEN'. It intercepts CMP operands and applies tailored mutations." },
        { q: "What does an ablation study show?", options: ["How fast the fuzzer is", "How much each component contributes, by turning components off", "Which bugs are CVEs", "The statistical significance"], a: 1, why: "FOX (BASE/SCHED/FULL), ChatAFL (CL0–CL3) and Fuzz4All (prompt and loop variants) all run ablations." },
        { q: "Which oracle catches a heap use-after-free that would otherwise not crash?", options: ["Coverage bitmap", "AddressSanitizer", "Mann-Whitney U", "Dictionary"], a: 1, why: "ASAN instruments memory accesses and reports UAF, overflows and leaks with stack traces. ChatAFL uses ASAN stack traces to tell bugs apart." }
      ] }
  ]
});

/* ======================================================================
   CHAPTER 1: FOX
   ====================================================================== */
FL.CHAPTERS.push({
  id: "fox", num: "1", color: "var(--fox)", title: "FOX: The Control Room", venue: "ACM CCS 2024 · Salt Lake City",
  blurb: "Fuzzing as online stochastic control: frontier branches, branch distance, a provably greedy scheduler and a Newton's-method mutator.",
  paper: "Dongdong She*, Adam Storek*, Yuchong Xie, Seoyoung Kweon, Prashast Srivastava, Suman Jana. FOX: Coverage-guided Fuzzing as Online Stochastic Control. CCS '24. (*equal contribution)",
  steps: [
    { id: "f-meet", type: "scene", title: "Meet the FOX team",
      setting: "A video call between Columbia University (New York) and HKUST (Hong Kong).",
      disclaimer: true,
      lines: [
        { who: "narr", text: "Two time zones, one shared document. The author list has an asterisk: Dongdong She and Adam Storek contributed equally." },
        { who: "jana", text: "We've worked on fuzzer guidance for years. NEUZZ smoothed programs with neural networks. K-Scheduler ranked seeds with graph centrality. Both are in this paper's references." },
        { who: "she", text: "And every time we hit the same wall. The scheduler and the mutator are two strangers who both want new coverage, but they barely talk to each other." },
        { who: "storek", text: "So this time we don't add another heuristic. We write down what fuzzing is, mathematically, and then optimize that." },
        { who: "me", text: "Write down fuzzing… as an equation?" },
        { who: "she", text: "As a control problem. You'll see. Start with the two things that are broken." }
      ] },

    { id: "f-problem", type: "scene", title: "Two broken parts",
      setting: "Whiteboard, Columbia CS building.",
      disclaimer: true,
      lines: [
        { who: "storek", text: "Broken part one is the scheduler. It favours seeds that gave coverage before. Late in a campaign, coverage-increasing inputs become rare, so the signal goes sparse and the scheduler degenerates into round-robin." },
        { who: "me", text: "Why not just give it richer feedback, like data flow?" },
        { who: "she", text: "People tried. Finer-grained metrics such as data-flow coverage blow up the seed corpus. You drown in seeds." },
        { who: "storek", text: "Broken part two is the mutator. It is agnostic of the branch it is trying to flip. It mutates randomly and hopes." },
        { who: "me", text: "Taint tracking would tell it which bytes matter." },
        { who: "she", text: "At a cost the paper calls 'prohibitively high overhead.' We want branch-aware mutation that's cheap." },
        { who: "jana", text: "So the goal is a scheduler with fine-grained feedback but no explosion, a mutator that understands branches but stays cheap, and one objective that ties them together." }
      ] },

    { id: "f-control", type: "lesson", title: "The big idea: fuzzing as online stochastic control",
      html: `
<p>FOX starts from the objective every coverage-guided fuzzer secretly has: pick a sequence of seeds that maximizes total coverage over K stages.</p>
<div class="eq">Maximize  Σ<sub>i=1..K</sub> cov( mut( S<sub>i</sub>[u<sub>i</sub>] ), S<sub>i</sub> )      (Eq. 1)</div>
<p>It is an <span class="t" data-g="online-opt">online</span> problem, because you only see cov(·) after you've executed the mutant. It is <span class="t" data-g="stochastic-control">stochastic</span>, because the mutator is random and the program's response is uncertain. So FOX models it as <b>stochastic optimal control</b> with five components:</p>
<div class="scrollx"><table class="data">
<tr><th>Component</th><th>In FOX</th></tr>
<tr><td><span class="t" data-g="state-space">State space</span></td><td>the seed corpus S<sub>i</sub> at <span class="t" data-g="stage">stage</span> i</td></tr>
<tr><td><span class="t" data-g="control-space">Control space</span></td><td>which seed to pick: index u<sub>i</sub>, 1 ≤ u<sub>i</sub> ≤ |S<sub>i</sub>|</td></tr>
<tr><td>Dynamics</td><td>x ← mut(S<sub>i</sub>[u<sub>i</sub>]); g<sub>i</sub> = E[cov(x, S<sub>i</sub>)]; S<sub>i+1</sub> ← update(S<sub>i</sub>, x, g<sub>i</sub>)</td></tr>
<tr><td>Objective</td><td>Maximize Σ g<sub>i</sub> (expected total coverage gain), Eq. 3</td></tr>
<tr><td>Constraint</td><td>Σ t<sub>i</sub> ≤ T (time budget), Eq. 4</td></tr>
</table></div>
<p>The mutator and the target program together are the <em>system dynamics</em>. The scheduler is the <em>controller</em> that makes "probabilistic online control decisions." Both now serve one objective.</p>
<div class="callout say">"FOX formulates coverage-guided fuzzing as online stochastic control. The state is the corpus, the control is which seed to schedule, the dynamics are the random mutator plus the program, and the goal is maximum expected coverage within a time budget. That gives one objective that both the scheduler and the mutator serve."</div>` },

    { id: "f-decomp", type: "lesson", title: "Breaking cov(·) apart",
      html: `
<p>FOX writes coverage as a sum of 0/1 <span class="t" data-g="bernoulli">indicators</span>, one per unseen branch b ∈ B<sub>i</sub>. By <span class="t" data-g="linearity-exp">linearity of expectation</span>:</p>
<div class="eq">g<sub>i</sub> = Σ<sub>b∈B<sub>i</sub></sub> E[cov<sub>b</sub>(x,S<sub>i</sub>)] = Σ<sub>b∈B<sub>i</sub></sub> Pr(b flips | mut(S<sub>i</sub>[u<sub>i</sub>]))      (Eq. 5–6)</div>
<p>Assumptions, which AFL++ havoc satisfies: each seed's mutator has a fixed but unknown probability of flipping a branch, and mutants for different seeds are independent.</p>
<h4>The catch</h4>
<p>How do you estimate Pr(b flips) for a branch that has <em>never</em> flipped? Counting frequencies gives 0 every time, and once it flips you no longer care. FOX's fix:</p>
<ol>
<li>Look only at <span class="t" data-g="frontier-branch">frontier branches</span>: reached but not yet flipped.</li>
<li>Measure a finer signal, the <span class="t" data-g="branch-distance">branch distance</span> δ<sub>b</sub>, which says how close an input is to flipping.</li>
<li>Every flip implies a decrease in δ (X ⇒ Y), but not every decrease is a flip. So <b>Pr(b flips) ≤ Pr(δ<sub>b</sub> decreases)</b>. Decreases are frequent, so they are a usable <span class="t" data-g="proxy">proxy and upper bound</span>.</li>
</ol>
<div class="eq">g<sub>i</sub> ≈ Σ<sub>b∈FB<sub>i</sub></sub> Pr(δ<sub>b</sub> decreases | mut(S<sub>i</sub>[u<sub>i</sub>]))      (Eq. 9)</div>
<div class="callout trap">Unseen branches you haven't even <em>reached</em> have no branch distance at all, because their comparison never executes. That is exactly why FOX restricts to frontier branches.</div>` },

    { id: "f-frontier", type: "sim", title: "Frontier Finder", game: "frontierFinder",
      intro: "Filled nodes are visited, hollow nodes are unvisited. Tap every frontier node: a visited node with an edge into unvisited code. Three levels." },

    { id: "f-dist-l", type: "lesson", title: "Branch distance, Table 1",
      html: `
<p>For each frontier branch, FOX's instrumentation sees the 2-tuple <b>(Q<sub>b</sub>(f<sub>b</sub>(x)), R<sub>b</sub>)</b>: the current truth value and the comparison type. It picks a linear or piece-wise linear δ<sub>b</sub> so that pushing δ to zero flips the branch:</p>
<div class="scrollx"><table class="data">
<tr><th>Q<sub>b</sub>(f<sub>b</sub>(x))</th><th>R<sub>b</sub></th><th>δ<sub>b</sub>(x) (as printed)</th></tr>
<tr><td>false / true</td><td>&lt; / ≥</td><td>f<sub>b</sub>(x) − 1</td></tr>
<tr><td>false / true</td><td>≤ / &gt;</td><td>f<sub>b</sub>(x)</td></tr>
<tr><td>false / true</td><td>&gt; / ≤</td><td>1 − f<sub>b</sub>(x)</td></tr>
<tr><td>false / true</td><td>≥ / &lt;</td><td>−f<sub>b</sub>(x)</td></tr>
<tr><td>false / true</td><td>= / ≠</td><td>|f<sub>b</sub>(x)|</td></tr>
<tr><td>false / true</td><td>≠ / =</td><td>1 − |f<sub>b</sub>(x)|</td></tr>
</table></div>
<p>Pairs on one row mean the same thing: "x &lt; 0 is false" is the same as "x ≥ 0 is true."</p>
<div class="callout trap">Check row 1 yourself. Every other row reaches δ = 0 exactly at the first flipping integer: for "x ≤ 0 is false", δ = f is 0 at f = 0, which flips. For "f &lt; 0 is false" you need f ≤ −1, so the consistent formula is f + 1, but the paper prints f − 1. Quote the table as printed and mention the likely sign typo. The Branch Distance Dial lets you see it happen.</div>
<h4>The paper's own example</h4>
<p>Branch <code>if (x ≤ 15)</code>, so f<sub>b</sub>(x) = x − 15, with reaching input x = 5. Q is true and R is ≤, so δ = 1 − f<sub>b</sub>(x) = <b>16 − x</b>. Its root, x = 16, flips the branch.</p>
<p>In the implementation an LLVM pass hooks each CMP feeding a conditional branch. For integers, δ = op1 − op2. For strings, it is an array of byte-wise differences op1[i] − op2[i], with zero-byte padding to the longer length.</p>` },

    { id: "f-dist", type: "sim", title: "Branch Distance Dial", game: "branchDial",
      intro: "Pick a branch, drag the input, and watch δ fall to zero. The branch flips exactly where Table 1 says it should." },

    { id: "f-sched-l", type: "lesson", title: "The scheduler: greedy, and provably so",
      html: `
<p>Over all stages FOX maximizes Σ<sub>i</sub> Σ<sub>b∈FB<sub>i</sub></sub> Pr(δ<sub>b</sub> decreases) (Eq. 10). Most of those probabilities are near zero, so the inner <b>sum is approximated by its max</b> (Eq. 11). That is cheap to compute in a streaming setting.</p>
<ol>
<li><b>Per branch:</b> keep a mapping <span class="t" data-g="ts-map">TS</span>. TS[b].s is the seed with the lowest branch distance for b so far, and TS[b].d is that distance.</li>
<li><b>Pick the branch:</b> choose the frontier branch with the highest estimated probability and schedule its TS seed (Eq. 12).</li>
</ol>
<p>The estimate uses <span class="t" data-g="pt-tt">time, not hit counts</span>, so the time-budget constraint is built in:</p>
<div class="eq">Pr(δ<sub>b</sub> decreases) = λ<sub>b</sub> · pt(b) / tt(b)      (Eq. 13)</div>
<p>tt = total time running inputs that reach b. pt = time spent on inputs that lowered b's global minimum distance. λ<sub>b</sub> is a <span class="t" data-g="decay">decay</span> based on how often b's seed was already scheduled (counter SC). In code it is a <span class="t" data-g="log-prob">log-probability</span> to avoid underflow:</p>
<div class="codeblock"><span class="c">// Algorithm 1 — FOX scheduling for stage i</span>
b_max = ∅ ; best = −∞
<span class="k">for</span> b <span class="k">in</span> FB_i:
    score = log(PT[b]) − log(TT[b]) − log(SC[TS[b].s])
    <span class="k">if</span> score > best: b_max = b ; best = score
u_i = TS[b_max].s        <span class="c">// schedule that seed</span>
SC[u_i] += 1</div>
<div class="callout trap">The pseudocode in the paper initializes <code>b_max_logprob = ∞</code> and checks <code>if b_max_logprob &lt; b_logprob</code>. Read literally, nothing is ever larger than ∞. The intent is clearly an argmax, so start from −∞. If you spot that in a viva it shows careful reading.</div>
<p><b><span class="t" data-g="greedy-opt">Theorem 1</span>:</b> given fixed branch-flip probabilities before each stage, the greedy schedule that maximizes expected coverage gain at each stage is optimal among all schedules using the same estimates.</p>` },

    { id: "f-sched", type: "sim", title: "Scheduler Showdown", game: "schedulerShowdown",
      intro: "Five frontier branches with hidden difficulty. You have 40 stages. Race FOX's greedy PT/TT/SC rule against AFL-style round-robin, then try to beat both by hand." },

    { id: "f-proof", type: "lesson", title: "Why greedy is optimal (the proof, in four moves)",
      html: `
<p>Appendix A.1 uses a classic <b>exchange argument</b>. Here is the version you can say on a whiteboard.</p>
<ol>
<li><b>Set up.</b> Take any optimal schedule π = [u<sub>1</sub>, …, u<sub>n</sub>]. Build π′ by swapping only the first choice u<sub>1</sub> for the greedy choice u′<sub>1</sub>.</li>
<li><b>Name the probabilities.</b> p = Pr(b flips | u<sub>1</sub>), p′ = Pr(b flips | u′<sub>1</sub>), and q = the best per-stage flip probability afterwards. Greedy means p′ ≥ p.</li>
<li><b>Total expected gain.</b> For u<sub>1</sub> it is p + (1−p)(q + (1−q)q + … + (1−q)<sup>n−2</sup>q). For u′<sub>1</sub>, the same with p′.</li>
<li><b>Subtract.</b> The q-terms are a geometric CDF, so the difference simplifies to <b>(p′ − p)(1 − q)<sup>n−1</sup> ≥ 0</b>. The greedy swap never hurts. Repeat for u<sub>2</sub>, u<sub>3</sub>, …, and greedy is optimal.</li>
</ol>
<div class="callout trap">The theorem says "optimal given the estimates." FOX itself says its practical efficacy depends on how accurate the PT/TT estimates are. A sharp examiner may push on this: optimal under fixed probabilities and an accurate model, not optimal in the real world unconditionally.</div>` },

    { id: "f-mut-l", type: "lesson", title: "The mutator: local search, then Newton's leap",
      html: `
<p>The scheduler chose a seed for a frontier branch. Now the mutator should raise Pr(δ<sub>b</sub> decreases) for that branch, assuming branches are roughly linear near each seed.</p>
<h4>Step 1: <span class="t" data-g="local-search">local search</span></h4>
<p>Sample <b>k = 1024</b> mutants in a small neighbourhood N(x), using AFL++ havoc with fewer stacked perturbations. Then estimate a <span class="t" data-g="subgradient">subgradient</span> g, a linear under-approximation:</p>
<div class="eq">∀x′ ∈ N(x):  gᵀ·(x′ − x) ≤ δ<sub>b</sub>(x′) − δ<sub>b</sub>(x)</div>
<div class="eq">g = argmax<sub>g′</sub> ‖g′‖₁ ,   g′ = (δ<sub>b</sub>(x′) − δ<sub>b</sub>(x)) ⊘ (x′ − x)</div>
<p>⊘ is element-wise division. FOX minimizes <em>under-approximation error</em>, not average error, "to ensure that the Newton's method remains stable."</p>
<h4>Step 2: <span class="t" data-g="newton">Newton's method</span></h4>
<div class="eq">x<sub>new</sub> = x − δ<sub>b</sub>(x) ⊘ g</div>
<p>If δ is linear and the branch is feasible, one step flips it. If δ is a well-behaved <span class="t" data-g="convex">convex</span> function, the step still likely reduces the distance. A mutant goes to Newton only if its subgradient's L1 norm beats the best seen so far for that branch (Algorithm 2).</p>
<h4>Strings</h4>
<p><code>strcmp</code> and <code>strncmp</code> are treated as many single-byte integer comparisons solved together. FOX finds <span class="t" data-g="hot-bytes">hot bytes</span> by applying one byte-difference at a time, then infers the other hot bytes from adjacency and the string length.</p>
<div class="callout say">"Local search samples 1024 nearby mutants to estimate a subgradient, a linear lower bound on the branch distance. Newton's method then jumps to the root, x minus delta over g. One step flips a linear branch, which is why it's cheap compared with taint inference."</div>` },

    { id: "f-newton", type: "sim", title: "Newton's Leap", game: "newtonLeap",
      intro: "Solve a magic-number branch three ways: random havoc, local search plus Newton, and then a checksum branch where Newton fails. That failure is FOX's main stated limitation." },

    { id: "f-hot", type: "sim", title: "Hot Byte Hunter", game: "hotBytes",
      intro: "The target does strcmp(input+3, \"FOX!\"). Find one hot byte with single-byte probes, infer the rest by adjacency, then solve every byte with Newton." },

    { id: "f-impl", type: "lesson", title: "Under the hood: implementation",
      html: `
<ul>
<li><b>Frontier branch identification.</b> FOX extends AFL++'s LLVM instrumentation pass to extract an intra-procedural CFG per function and embed it in the binary. At runtime nodes are marked visited or unvisited (Eq. 7) and the frontier set is updated (Eq. 8). Only nodes ending in conditional jumps count.</li>
<li><b>Branch distance tracking.</b> An LLVM pass inserts a hook right after each CMP that feeds a conditional branch and intercepts op1 and op2. Distances go into shared memory that FOX reads.</li>
<li><b><span class="t" data-g="adaptive-switch">Adaptive switch</span>.</b> Hooking every branch would be slow, so a hook fires only for frontier branches and turns off once all children of a node are visited.</li>
<li><b>Scheduler state.</b> Counters PT and TT are indexed by the branch's CFG node id, plus TS and SC. They update after every execution.</li>
</ul>
<div class="callout story">The paper notes a surprise: on some targets FOX achieves <em>higher throughput</em> than AFL++. Two reasons: the PT/TT ratio indirectly penalizes slow seeds, and instrumentation is switched off for branches already flipped.</div>` },

    { id: "f-eval-l", type: "scene", title: "Six CPU-years later",
      setting: "The evaluation cluster: 10 machines, Intel Xeon 2.00 GHz, 100 GB RAM, Debian bullseye.",
      disclaimer: true,
      lines: [
        { who: "storek", text: "First problem: FuzzBench alone can't separate fuzzers. About a third of its binaries have under 20,000 edges, or ship so many test cases they saturate early." },
        { who: "she", text: "Remember SBFT'23? The winner beat AFL++ with cmplog and dictionary by a modest 1.28% mean coverage." },
        { who: "storek", text: "So we hand-picked 15 large standalone programs from prior fuzzing papers: ffmpeg, binutils, tcpdump, libtiff tools, xpdf's pdftotext, exiv2, bsdtar, xmllint, jasper. That's 38 programs with FuzzBench's 23." },
        { who: "sriv", text: "Ten 24-hour campaigns for every fuzzer-program pair, one core each. Then Magma for ground-truth bugs." },
        { who: "kweon", text: "php from Magma refused to link, a dependency incompatibility, so 17 programs from 8 libraries." },
        { who: "she", text: "And the fair fight: AFL++ 4.09c, AFL++ with cmplog, AFL++ with cmplog and dictionary. We also ran FOX with a dictionary, so it's apples to apples." }
      ] },

    { id: "f-rq", type: "lesson", title: "Five research questions",
      html: `
<ol>
<li><b>RQ1 Coverage:</b> can FOX reach code state-of-the-art fuzzers couldn't?</li>
<li><b>RQ2 Bugs:</b> does it find more bugs (Magma plus in-the-wild)?</li>
<li><b>RQ3 Control space:</b> how much smaller is the decision space?</li>
<li><b>RQ4 Ablation:</b> how much do the scheduler and the mutator each contribute?</li>
<li><b>RQ5 Introspection:</b> which branch characteristics make a branch solvable by FOX?</li>
</ol>
<div class="kv panel">
<span>Baselines</span><b>AFLPP 4.09c, AFLPP+C, AFLPP+CD</b>
<span>FOX variants</span><b>FOX, FOX+D</b>
<span>Benchmarks</span><b>23 FuzzBench + 15 standalone = 38</b>
<span>Trials</span><b>10 × 24h per pair, 1 core each</b>
<span>Seeds</span><b>FuzzBench defaults; 1 seed per standalone (AFL++ repo)</b>
<span>Stats</span><b>Mann-Whitney U, p &lt; 0.05</b>
<span>Magma</span><b>17 programs, 8 libraries, 5 × 24h</b>
</div>` },

    { id: "f-results", type: "sim", title: "Results Explorer", game: "foxResults",
      intro: "Real numbers from Table 4 (standalone programs, mean edges over 10 × 24h). Switch the comparison and find where FOX loses as well as where it wins." },

    { id: "f-bugs", type: "lesson", title: "Bugs, control space, ablation",
      html: `
<h4>RQ2: bugs</h4>
<ul>
<li>Magma: FOX triggers <b>up to 16.16% more</b> ground-truth bugs and matches or beats the others on every program (49 triggered and 131 reached, vs AFL++ 43 and 118).</li>
<li>In the wild: FOX 9, AFL++ 5, AFLPP+C 9, AFLPP+CD 7, <b>FOX+D 20 unique bugs</b>: 2 use-after-free, 3 invalid free, 12 assertion violations, 1 infinite loop, 2 NULL dereferences. 10 of them were found only by FOX+D.</li>
<li><b>xpdf: 12 bugs, 8 previously unknown</b>, confirmed by the developers. FOX+D covered 21.93% more edges there, and edges vs. crashes had Pearson r = 0.88.</li>
</ul>
<h4>RQ3: control space</h4>
<p>AFL++'s queue grows monotonically. FOX reasons over frontier branches, a set that stays compact and on readelf even shrinks. Average reduction: <b>49.18% at 12h, 58.20% at 24h</b>, up to <b>7×</b> on readelf. Exception: xmllint had more frontier branches than seeds in the first hour.</p>
<h4>RQ4: ablation (15 standalone, 10 × 1h)</h4>
<p>FOX-BASE (both off) → FOX-SCHED (scheduler only) → FOX (both). Full FOX: <b>+20.07% over BASE, +9.23% over SCHED</b>. The scheduler alone gives up to 27.2% on pdftotext (exception: xmllint). Adding Newton gives up to 31.9% (exception: tiff2ps, which has many non-convex branches).</p>
<h4>RQ5: introspection</h4>
<p>FOX flips <b>33.99% more</b> frontier branches than AFL++ and up to 21.05% more than AFLPP+C. FOX+D flips 19.47% more than AFLPP+CD. A <span class="t" data-g="midpoint">midpoint convexity</span> estimate correlates positively with flipping success (logistic regression, McFadden pseudo-R² = 0.048).</p>` },

    { id: "f-limits", type: "lesson", title: "Where FOX struggles (examiners love this)",
      html: `
<ul>
<li><b>Non-convex branches:</b> checksums, hash functions, complex string operations. Newton's method assumes local linearity or convexity.</li>
<li><b>Unsupported branch types:</b> floating-point comparisons and variable-vs-variable string comparisons (seen in lcms and proj4), plus nested conditions (lcms, openthread, proj4, zlib on FuzzBench).</li>
<li><b>Havoc as the sampler:</b> it can't adaptively control mutation extent, which causes redundant samples. Future work: a mutator that adapts to past reaching success.</li>
<li><b>Estimate quality:</b> Theorem 1 is only as good as the PT/TT estimates. <span class="t" data-g="pathological">Pathological branches</span> keep shrinking δ but never flip, which suggests they're infeasible. Planned fix: aggressive re-weighting.</li>
</ul>
<h4>How FOX differs from its neighbours</h4>
<div class="scrollx"><table class="data">
<tr><th>Work</th><th>Their idea</th><th>FOX's difference</th></tr>
<tr><td>REDQUEEN</td><td>input colorization, input-to-state</td><td>flexible mutations, no strong consistency assumption</td></tr>
<tr><td>Angora</td><td>gradient descent + taint</td><td>local search + Newton, no taint</td></tr>
<tr><td>NEUZZ</td><td>neural network smooths branches</td><td>simpler model from fewer samples</td></tr>
<tr><td>FairFuzz</td><td>targets rare branches</td><td>branch-distance-targeted inputs</td></tr>
<tr><td>K-Scheduler</td><td>graph centrality over whole CFG</td><td>only frontier data, avoids overestimating unreachable code</td></tr>
<tr><td>Path / data-flow feedback</td><td>finer feedback</td><td>frontier granularity avoids seed explosion</td></tr>
</table></div>` },

    { id: "f-recap", type: "lesson", title: "Your 60-second FOX answer",
      html: `
<div class="callout say"><b>Problem.</b> Coverage-guided fuzzers' schedulers starve on sparse feedback and drift into round-robin. Their mutators ignore branch logic. The two components don't share an objective.<br><br>
<b>Idea.</b> Formulate fuzzing as online stochastic control: the corpus is the state, seed choice is the control, mutator plus program are the stochastic dynamics, and the goal is maximum expected coverage within a time budget.<br><br>
<b>Key trick.</b> Expected gain is a sum of flip probabilities. These are unknowable for unflipped branches, so FOX uses the probability that the branch distance decreases, an upper bound, and only on frontier branches.<br><br>
<b>Scheduler.</b> Greedy over frontier branches, score = PT/TT discounted by the schedule count, computed in log space. Provably optimal given the estimates (Theorem 1, exchange argument).<br><br>
<b>Mutator.</b> Local search with 1024 havoc samples gives a subgradient, then a Newton step x − δ/g. Hot-byte inference handles strings.<br><br>
<b>Results.</b> +26.45% coverage over AFL++ on 15 standalone programs, +6.59% on FuzzBench, 58.20% smaller control space, 20 bugs with FOX+D (8 new in xpdf).<br><br>
<b>Limits.</b> Non-convex branches (hashes, checksums), floating point, var-var string compares, and dependence on estimate quality.</div>` },

    { id: "f-quiz", type: "quiz", title: "FOX checkpoint",
      qs: [
        { q: "In FOX's control formulation, what is the 'control space'?", options: ["The set of mutation operators", "The choice of which seed (index u_i) to mutate at each stage", "The time budget T", "The CFG"], a: 1, why: "State = corpus S_i. Control = seed index u_i. FOX later shrinks it by scheduling over frontier branches." },
        { q: "Why does FOX use Pr(δ_b decreases) instead of Pr(b flips)?", options: ["It's cheaper to instrument", "Flip frequencies are zero for not-yet-flipped branches. Every flip implies a decrease, so the decrease probability is an observable upper bound", "Branch distance is the same as coverage", "Because of Theorem 1"], a: 1, why: "X ⇒ Y, so Pr(flip) ≤ Pr(decrease). Decreases are frequent enough to estimate." },
        { q: "Which nodes are FOX frontier nodes?", options: ["Unvisited nodes at the boundary", "Visited nodes with an edge to an unvisited node", "All conditional branches", "Nodes with the highest centrality"], a: 1, why: "F = {v | (v,u) ∈ E, v ∈ V, u ∈ U}. Unvisited boundary nodes are K-Scheduler's horizon nodes." },
        { q: "Branch if (x ≤ 15), current x = 5 (true). Using Table 1, δ(x) is…", options: ["x − 15", "16 − x", "|x − 15|", "15 − x"], a: 1, why: "Q = true, R = ≤ → δ = 1 − f(x) = 1 − (x − 15) = 16 − x. Root at 16." },
        { q: "FOX's probability estimate for a frontier branch is…", options: ["hits / executions", "λ_b · pt(b) / tt(b), computed in log space", "1 / |corpus|", "edge centrality"], a: 1, why: "Productive time over total time, discounted by the schedule count, with logs to avoid underflow." },
        { q: "How many local-search samples (k) does FOX use per scheduled seed?", options: ["32", "256", "1024", "65536"], a: 2, why: "k = 1024, 'a good trade-off between the number of local searches performed and Newton's method steps taken.'" },
        { q: "Why minimize under-approximation error rather than average error in local search?", options: ["It's faster", "It keeps Newton's method stable", "It's required by Theorem 1", "To reduce memory"], a: 1, why: "A line that never overshoots the true distance keeps Newton steps from wildly overshooting." },
        { q: "Average coverage gain of FOX over AFL++ on the 15 standalone programs?", options: ["6.59%", "12.90%", "26.45%", "58.20%"], a: 2, why: "26.45% vs AFL++, 16.98% vs AFLPP+C, 12.90% vs AFLPP+CD. FuzzBench: up to 6.59%. 58.20% is the control-space reduction." },
        { q: "Which branch type is FOX's main stated weakness?", options: ["Integer equality", "Non-convex ones such as checksums and hashes", "Pointer comparisons", "Loops"], a: 1, why: "Newton's method assumes linear or convex behaviour. tiff2ps, with many non-convex branches, was the exception in the ablation." },
        { q: "What does the ablation (FOX-BASE / FOX-SCHED / FOX) show?", options: ["Only the scheduler matters", "Both matter: +20.07% over BASE, +9.23% over SCHED", "The mutator hurts coverage", "No significant difference"], a: 1, why: "Both components contribute. The scheduler alone gives up to 27.2% (pdftotext), adding Newton up to 31.9% more." }
      ] }
  ]
});
