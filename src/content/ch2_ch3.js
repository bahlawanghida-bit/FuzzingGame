window.FL = window.FL || {};
FL.CHAPTERS = FL.CHAPTERS || [];

/* ======================================================================
   CHAPTER 2: ChatAFL
   ====================================================================== */
FL.CHAPTERS.push({
  id: "chat", num: "2", color: "var(--chat)", title: "ChatAFL: The Protocol Whisperer", venue: "NDSS 2024 · San Diego",
  blurb: "Network servers are stateful and their specs are 100-page RFCs. ChatAFL asks an LLM for grammars, missing messages and the next move.",
  paper: "Ruijie Meng, Martin Mirchev, Marcel Böhme, Abhik Roychoudhury. Large Language Model guided Protocol Fuzzing. NDSS 2024.",
  steps: [
    { id: "c-meet", type: "scene", title: "Meet the ChatAFL team",
      setting: "National University of Singapore, with a call to MPI-SP in Bochum.",
      disclaimer: true,
      lines: [
        { who: "narr", text: "This group knows protocol fuzzing from the inside. AFLNet, the most popular open-source protocol fuzzer, was built by Van-Thuan Pham, Marcel Böhme and Abhik Roychoudhury. ChatAFL is built on top of it." },
        { who: "abhik", text: "Protocol implementations face the internet. A single code-execution bug in one makes even the most secure system vulnerable to remote attack." },
        { who: "bohme", text: "And they're hard to test. The same input sent twice can give two different answers, because the server has state." },
        { who: "meng", text: "Everything a fuzzer needs, the message structure and the message order, is written in an RFC. In English. RTSP alone is RFC 2326, 92 pages." },
        { who: "me", text: "And the fuzzer can't read English." },
        { who: "meng", text: "Not until now. A model like ChatGPT has already read millions of pages of those specs. Can we interrogate it and get machine-readable answers?" },
        { who: "mirchev", text: "Before we build anything, we test whether the idea even works. Case study first." }
      ] },

    { id: "c-why", type: "lesson", title: "Why protocol fuzzing is hard",
      html: `
<p>A <span class="t" data-g="protocol">protocol</span> fixes both the <b>structure</b> of each message and the <b>order</b> of messages. Servers are <span class="t" data-g="stateful">stateful</span>: to reach a bug in state PLAY you must first send the right messages, in the right format, in the right order.</p>
<p>Two ways to fuzz protocols:</p>
<ul>
<li><b>Generator-based</b> (Peach, BooFuzz): a human writes a machine-readable model of the protocol. Tedious, error-prone, and often covers only part of the spec.</li>
<li><b>Mutation-based</b> (<span class="t" data-g="aflnet">AFLNet</span>, <span class="t" data-g="nsfuzz">NSFuzz</span>): mutate recorded real message sequences. Recordings keep structure and order mostly valid while the mutations corrupt them slightly. This is the state of the art.</li>
</ul>
<h4>The three challenges ChatAFL names</h4>
<div class="stack">
<div class="callout"><b>C1: dependence on initial seeds.</b> Recorded sequences rarely cover the variety of states and message types in the spec.</div>
<div class="callout"><b>C2: unknown message structure.</b> Without a grammar the fuzzer can't build a new message type or swap a whole coherent field. Byte mutations mostly break the syntax.</div>
<div class="callout"><b>C3: unknown state space.</b> Without a state model the fuzzer can't tell what state it is in or steer toward unseen states.</div>
</div>` },

    { id: "c-rtsp-l", type: "lesson", title: "Anatomy of an RTSP message",
      html: `
<p>Figure 1 of the paper shows a real PLAY request from Live555's test client:</p>
<div class="codeblock"><span class="k">PLAY</span> rtsp://127.0.0.1:8554/aacAudioTest/ <span class="k">RTSP/1.0</span>\\r\\n
<span class="k">CSeq:</span> 4\\r\\n
<span class="k">User-Agent:</span> ./testRTSPClient (LIVE555 Streaming Media v2018.08.28)\\r\\n
<span class="k">Session:</span> 000022B8\\r\\n
<span class="k">Range:</span> npt=0.000-\\r\\n
\\r\\n</div>
<p>A header line (method, address, version), then <code>Key: Value</code> fields, each terminated by CRLF (<code>\\r\\n</code>). Some fields are type-specific: <b>Transport</b> only in SETUP, <b>Session</b> in everything except SETUP and OPTIONS, <b>Range</b> only in PLAY, PAUSE and RECORD.</p>
<p>The <span class="t" data-g="state-machine">state machine</span> (Figure 2): from INIT only SETUP or ANNOUNCE leads to READY. To reach PLAY from INIT you need at least two messages of specific types and structures.</p>` },

    { id: "c-server", type: "sim", title: "Live555 Simulator", game: "rtspServer",
      intro: "You are the fuzzer and this is the server. Send requests, watch the state machine and the response codes (AFLNet treats each code as a state), and reproduce ChatAFL's bug #1, a heap use-after-free." },

    { id: "c-case", type: "scene", title: "The case study: can the LLM help?",
      setting: "Four weeks before the deadline. A spreadsheet of 50 sampled ChatGPT answers.",
      disclaimer: true,
      lines: [
        { who: "meng", text: "First we needed ground truth. Two of us read RFC 2326 separately and extracted the grammar by hand. Eight hours total, perfect agreement. Ten client request types, 2 to 5 header fields each." },
        { who: "mirchev", text: "Then we asked the LLM for the grammars and sampled 50 answers. All ten types show up in over 40 answers. For 9 of the 10, the grammar matched the ground truth in every answer." },
        { who: "me", text: "And the tenth?" },
        { who: "meng", text: "PLAY. The LLM sometimes forgot the optional Range field: included in 35 answers, missing in 15. It also invented a 'SET DESCRIPTION' type a couple of times, once each." },
        { who: "bohme", text: "Second question: can it enrich seeds? ProFuzzBench's Live555 seeds contain only 4 of the 10 types: DESCRIBE, SETUP, PLAY, TEARDOWN. AFLNet and NSFuzz never generated the missing six in our runs." },
        { who: "mirchev", text: "We had it generate 10 messages for each of the 10 types. 99% were placed in valid positions; one DESCRIBE landed after a SETUP. The server accepted 55.1% outright." },
        { who: "me", text: "Only 55%?" },
        { who: "mirchev", text: "20.4% were ANNOUNCE and RECORD, which Live555 doesn't support even though the RFC has them. 24.5% had the wrong session ID. The server assigns that at runtime, so the LLM can't know it. Put the server's responses in the prompt and it copies the right ID. Then everything was accepted." },
        { who: "abhik", text: "Third question: give it the conversation so far and ask for a message that moves the server to a new state. We asked 100 times per state." },
        { who: "meng", text: "81%, 74%, 89% and 69% of its answers caused a transition in INIT, READY, PLAY and RECORD. That's enough. We build it." }
      ] },

    { id: "c-algo", type: "lesson", title: "Algorithm 1: where the LLM plugs in",
      html: `
<p>Start with classic mutation-based protocol fuzzing (<span class="t" data-g="empf">EMPF</span>), which is AFLNet's loop:</p>
<ol>
<li>Choose a progressive <b>state s</b> from the inferred state machine.</li>
<li>Choose a recorded sequence <b>M</b> that exercises s, then split it into <span class="t" data-g="m1m2m3">⟨M1, M2, M3⟩</span>: M1 drives the server to s, M2 gets mutated, M3 is the remainder.</li>
<li>Assign energy. For each iteration, mutate M2, send ⟨M1, M2′, M3⟩, and save crashes. Keep the sequence if state or code coverage increased, and update the state machine.</li>
</ol>
<p>ChatAFL adds the gray lines of Algorithm 1:</p>
<div class="codeblock"><span class="c">// before fuzzing</span>
G ← <span class="k">ChatGrammar</span>(p)              <span class="c">// SA: lift grammars once</span>
C ← C ∪ <span class="k">EnrichCorpus</span>(C, p)       <span class="c">// SB: add missing message types</span>
PlateauLen ← 0
<span class="c">// inside the energy loop</span>
<span class="k">if</span> PlateauLen &lt; MaxPlateau:
    <span class="k">if</span> UniformRandom() &lt; ϵ:  M2′ ← <span class="k">GrammarMutate</span>(M2, G)
    <span class="k">else</span>:                    M2′ ← RandMutate(M2)
<span class="k">else</span>:                        M2′ ← <span class="k">ChatNextMessage</span>(M1, R)  <span class="c">// SC</span>
...
<span class="k">if</span> crashes:      PlateauLen ← 0
<span class="k">elif</span> interesting: PlateauLen ← 0 ; update state machine
<span class="k">else</span>:           PlateauLen += 1</div>
<div class="callout say">"ChatAFL keeps AFLNet's loop and adds three LLM touchpoints. It extracts grammars once before fuzzing for structure-aware mutation. It enriches the seed corpus with missing message types. And when coverage plateaus, it asks the LLM for the next message given the communication history. The LLM is called rarely, which keeps the fuzzer fast."</div>` },

    { id: "c-gram", type: "sim", title: "Grammar Painter", game: "grammarPainter",
      intro: "Strategy SA. Tap the parts of a PLAY request that should be <Value> (mutable). Keywords stay fixed. Then compare grammar-aware mutation with blind byte mutation." },

    { id: "c-prompt-l", type: "lesson", title: "Getting a parseable grammar out of a chatbot",
      html: `
<p>LLM answers are free-form text, but the fuzzer needs a fixed format. ChatAFL's solution is <span class="t" data-g="few-shot">in-context few-shot learning</span>. The prompt shows two examples in the exact output format and then asks for the target protocol:</p>
<div class="codeblock"><span class="c">// Figure 6 (abridged)</span>
For the RTSP protocol, the PLAY client request grammar is:
PLAY: {PLAY &lt;Value&gt; RTSP/1.0\\r\\n, CSeq: &lt;Value&gt;\\r\\n,
       User-Agent: &lt;Value&gt;\\r\\n, Session: &lt;Value&gt;\\r\\n, Range: &lt;Value&gt;\\r\\n}
For the HTTP protocol, the GET client request grammar is:
GET: {GET &lt;Value&gt;\\r\\n}
For the RTSP protocol, all of client request grammar is:</div>
<ul>
<li><b>Two shots, not one</b>, from different protocols, so the LLM doesn't copy a single example too literally.</li>
<li>Keywords are kept as immutable text. Mutable regions become <code>&lt;Value&gt;</code>.</li>
<li><span class="t" data-g="self-consistency">Self-consistency</span>: ask 5 times and keep the majority answer. Rare inventions like "SET DESCRIPTION" fall out.</li>
<li>LLMs sometimes ignore the word "all" and return only some types. ChatAFL simply asks again for the rest.</li>
<li><span class="t" data-g="temperature">Temperature</span> 0.5 for grammar and enrichment (precise), 1.5 for plateau breaking (diverse).</li>
</ul>
<div class="callout story">The authors report about one hour to write the two example shots, once. After that, testing a new protocol means changing only the protocol name in the prompt.</div>` },

    { id: "c-vote", type: "sim", title: "Majority Vote", game: "selfConsistency",
      intro: "Ask the model five times. Watch the noise in individual answers, then let the majority decide each message type's grammar." },

    { id: "c-enrich", type: "sim", title: "Seed Enrichment", game: "seedEnrich",
      intro: "Strategy SB. Compute MissingTypes = AllTypes − ExistingTypes, then insert two missing requests where the state machine allows them." },

    { id: "c-plateau", type: "sim", title: "Plateau Breaker", game: "plateauBreaker",
      intro: "Strategy SC. Run the fuzzer. PlateauLen counts uninteresting inputs in a row. When it passes MaxPlateau, ChatAFL shows the LLM the conversation and asks for the next message. Tune MaxPlateau and watch the trade-off." },

    { id: "c-setup", type: "lesson", title: "Experimental design",
      html: `
<div class="kv panel">
<span>Implemented in</span><b>AFLNet (C/C++ targets)</b>
<span>LLM</span><b>gpt-3.5-turbo</b>
<span>Temperatures</span><b>0.5 (grammar, seeds) · 1.5 (plateau)</b>
<span>Self-consistency</span><b>5 repetitions</b>
<span>MaxPlateau</span><b>512 uninteresting sequences (~10 min)</b>
<span>Prompt budget</span><b>max ineffective prompts = MaxPlateau/4</b>
<span>Baselines</span><b>AFLNet, NSFuzz-v</b>
<span>Trials</span><b>10 × 24h</b>
<span>Hardware</span><b>Xeon Platinum 8468V, 192 logical cores, 512 GB</b>
</div>
<div class="scrollx"><table class="data">
<tr><th>Subject</th><th>Protocol</th><th class="num">LOC</th></tr>
<tr><td>Live555</td><td>RTSP</td><td class="num">57k</td></tr>
<tr><td>ProFTPD</td><td>FTP</td><td class="num">242k</td></tr>
<tr><td>PureFTPD</td><td>FTP</td><td class="num">29k</td></tr>
<tr><td>Kamailio</td><td>SIP</td><td class="num">939k</td></tr>
<tr><td>Exim</td><td>SMTP</td><td class="num">118k</td></tr>
<tr><td>forked-daapd</td><td>DAAP</td><td class="num">79k</td></tr>
</table></div>
<p><b>Metrics.</b> Branch coverage; <span class="t" data-g="response-code">states</span> (unique response codes, following AFLNet and ProFuzzBench since no ground-truth state machine exists); <span class="t" data-g="state-transition">state transitions</span>; Speed-up (how much sooner ChatAFL reaches the baseline's 24h number); Â12. Bugs: run under ASAN, replay with AFLNet-replay, separate by stack trace.</p>
<div class="callout say">"Because ChatAFL is implemented inside AFLNet, any difference from AFLNet can be attributed to the LLM guidance. It's a clean controlled comparison."</div>` },

    { id: "c-results", type: "sim", title: "Results Explorer", game: "chatResults",
      intro: "Real Table III–V numbers: transitions, states and branches per subject. Switch metrics and baselines." },

    { id: "c-ablation", type: "lesson", title: "Ablation: which strategy did what?",
      html: `
<div class="scrollx"><table class="data">
<tr><th>Config</th><th>Adds</th><th class="num">Branch gain vs CL0</th><th class="num">Speed-up</th></tr>
<tr><td>CL0</td><td>AFLNet</td><td class="num">n/a</td><td class="num">1×</td></tr>
<tr><td>CL1</td><td>SA grammar-guided mutation</td><td class="num">3.04%</td><td class="num">2.0×</td></tr>
<tr><td>CL2</td><td>+ SB seed enrichment</td><td class="num">3.86%</td><td class="num">4.6×</td></tr>
<tr><td>CL3 = ChatAFL</td><td>+ SC plateau breaking</td><td class="num">5.9%</td><td class="num">6.1×</td></tr>
</table></div>
<ul>
<li><b>SA</b> helped ProFTPD, PureFTPD, Exim and forked-daapd by 2.4–6.7%, but Live555 and Kamailio only by 0.28% and 0.60%. Those two <em>don't strictly enforce the grammar</em>: messages with missing or wrong headers are still accepted, so keeping the structure valid buys less.</li>
<li><b>SB</b> added 0.82% on average, and 1.21–1.64% on Live555, ProFTPD and Kamailio. Elsewhere ProFuzzBench's seeds already contained nearly all types.</li>
<li><b>SC</b> added 0.69–4.78%. ProFTPD +2.72%, Kamailio +4.78%.</li>
</ul>
<div class="callout trap">"No strategy hurt" is the paper's claim: none had a negative impact on branch coverage. But some Â12 values in the ablation are close to 0.5 (e.g., Exim CL1 0.52), meaning weak effects. Say "every strategy helps on average, by different amounts per subject."</div>` },

    { id: "c-bugs", type: "lesson", title: "Nine zero-days, and bug #1 dissected",
      html: `
<div class="scrollx"><table class="data">
<tr><th>#</th><th>Subject</th><th>Bug</th><th>Impact</th></tr>
<tr><td>1</td><td>Live555</td><td>Heap UAF handling PLAY</td><td>RCE · CVE req., fixed</td></tr>
<tr><td>2</td><td>Live555</td><td>Heap UAF handling SETUP</td><td>RCE · CVE req., fixed</td></tr>
<tr><td>3</td><td>Live555</td><td>Use-after-return, DESCRIBE</td><td>RCE · CVE req.</td></tr>
<tr><td>4</td><td>Live555</td><td>Use-after-return, SETUP</td><td>RCE · CVE req.</td></tr>
<tr><td>5</td><td>Live555</td><td>Heap buffer overflow handling stream</td><td>RCE · CVE req.</td></tr>
<tr><td>6</td><td>Live555</td><td>Memory leak (stream parameters)</td><td>Leak · reported</td></tr>
<tr><td>7</td><td>Live555</td><td>Heap UAF in RTPInterface::sendDataOverTCP</td><td>RCE · CVE req.</td></tr>
<tr><td>8</td><td>ProFTPD</td><td>Heap buffer overflow parsing FTP commands</td><td>RCE · CVE req., fixed</td></tr>
<tr><td>9</td><td>Kamailio</td><td>Memory leak parsing config files</td><td>Leak · reported</td></tr>
</table></div>
<p>7 of 9 confirmed, 3 fixed at submission time. 7 of 9 are potentially security-critical. <b>AFLNet found 3 of them (#5, #6, #9) and NSFuzz found 4 (#5, #6, #7, #9)</b>, with the same versions and the same 10 × 24h budget. Neither found anything ChatAFL missed.</p>
<h4>Bug #1, the full causal chain</h4>
<ol>
<li>Memory for a track's usage environment is freed while processing <b>PAUSE</b>, then used again when the next <b>PLAY</b> arrives.</li>
<li>Minimal trigger: <b>SETUP → PLAY → PAUSE → PLAY</b>. Drop any message and the bug disappears.</li>
<li>Transitions needed: INIT→READY, READY→PLAY, PLAY→READY, READY→PLAY.</li>
<li>PAUSE was <em>not in the initial seeds</em>, and no AFLNet or NSFuzz run ever generated one. ChatAFL's <b>seed enrichment</b> added PAUSE, the <b>plateau handler</b> can propose PAUSE in state PLAY, and <b>structure-aware mutation</b> keeps all four messages valid.</li>
</ol>
<div class="callout say">"Bug #1 needs all three strategies working together. Enrichment supplies the missing PAUSE type, the LLM's state reasoning proposes PAUSE in PLAY, and grammar-aware mutation keeps the four-message sequence valid. Byte-level mutators break the structure."</div>` },

    { id: "c-limits", type: "lesson", title: "Limits and positioning",
      html: `
<ul>
<li><b>Needs public RFCs.</b> It targets text-based protocols whose specs are in the LLM's training data. Proprietary protocols may not work well.</li>
<li><b>Text only.</b> The evaluation covers all <em>text-based</em> ProFuzzBench subjects. Binary protocols are not evaluated.</li>
<li><b>LLM stochasticity and cost.</b> Mitigated with self-consistency, by calling the LLM only at plateaus, and by capping ineffective prompts at MaxPlateau/4.</li>
<li><b>Runtime context.</b> Session IDs and similar values must come from real seeds or responses in the prompt.</li>
</ul>
<h4>Related work map</h4>
<div class="scrollx"><table class="data">
<tr><th>Line of work</th><th>Examples</th><th>Gap ChatAFL fills</th></tr>
<tr><td>Grammar/generation-based</td><td>Peach, BooFuzz</td><td>no manual spec writing</td></tr>
<tr><td>Dynamic message inference</td><td>Polyglot, TreeFuzz</td><td>these only see observed messages, so they can deviate from the true structure</td></tr>
<tr><td>State inference</td><td>AFLNet (codes), StateAFL, SGFuzz, NSFuzz (variables)</td><td>delegates "what is a state" reasoning to the LLM</td></tr>
<tr><td>LLM fuzzing</td><td>CodaMosa, TitanFuzz, FuzzGPT, ChatFuzz</td><td>separates information extraction from fuzzing and calls the LLM only at plateaus, for efficiency</td></tr>
</table></div>` },

    { id: "c-recap", type: "lesson", title: "Your 60-second ChatAFL answer",
      html: `
<div class="callout say"><b>Problem.</b> Protocol servers are stateful and their structure and order are specified only in natural-language RFCs. Mutation-based fuzzers like AFLNet depend on limited recorded seeds (C1), don't know message structure (C2), and can't navigate the state space (C3).<br><br>
<b>Insight.</b> LLMs have read the RFCs. A case study on RTSP/Live555 shows they produce accurate grammars (9 of 10 types perfect), can enrich seeds (99% correctly placed) and can suggest state-changing messages (69–89%).<br><br>
<b>Design.</b> Built into AFLNet. SA: few-shot plus self-consistency grammar extraction, then structure-aware mutation of the &lt;Value&gt; fields. SB: insert missing message types into seeds. SC: when PlateauLen exceeds 512, ask the LLM for the next message from the communication history.<br><br>
<b>Results.</b> vs AFLNet: +47.60% transitions, +29.55% states, +5.81% branches, transitions 48× faster. vs NSFuzz: +42.69%, +25.75%, +6.74%. 9 new bugs vs 3 and 4.<br><br>
<b>Limits.</b> Needs public specs in the training data, text protocols only, LLM cost and randomness.</div>` },

    { id: "c-quiz", type: "quiz", title: "ChatAFL checkpoint",
      qs: [
        { q: "How does AFLNet (and ChatAFL) define a protocol 'state'?", options: ["A program variable", "The server's response code", "A memory snapshot", "The TCP port"], a: 1, why: "With no ground-truth state machine, distinct states are the set of unique response codes returned by the server." },
        { q: "Which three challenges does ChatAFL target?", options: ["Speed, memory, cost", "C1 seed dependence, C2 unknown message structure, C3 unknown state space", "Crashes, hangs, leaks", "Precision, recall, F1"], a: 1, why: "Each strategy addresses one: SB→C1, SA→C2, SC→C3." },
        { q: "Why does the grammar prompt include TWO example shots?", options: ["The API requires it", "So the LLM doesn't copy a single example too literally and miss important facts", "To save tokens", "One for requests and one for responses"], a: 1, why: "Two shots from different protocols (RTSP PLAY, HTTP GET) teach the format without over-anchoring." },
        { q: "What filters out rare hallucinations like 'SET DESCRIPTION'?", options: ["ASAN", "Self-consistency: 5 repetitions, majority answer", "Temperature 1.5", "Mann-Whitney U"], a: 1, why: "Ask several times and keep the consistent majority, similar to self-consistency in prompting." },
        { q: "When does ChatAFL ask the LLM for the next message?", options: ["Every iteration", "When PlateauLen exceeds MaxPlateau (512)", "Only before fuzzing", "When a crash happens"], a: 1, why: "PlateauLen counts consecutive uninteresting sequences and resets on a crash or coverage increase." },
        { q: "Why did 24.5% of LLM-generated requests fail in the case study?", options: ["Wrong RTSP version", "Wrong session IDs, which the server assigns at runtime", "Too long", "Unsupported methods"], a: 1, why: "The fix was to include server responses or real seeds in the prompt. 20.4% were ANNOUNCE/RECORD, which Live555 doesn't support." },
        { q: "Why did grammar-guided mutation (SA) barely help Live555 and Kamailio?", options: ["The grammar was wrong", "Those servers don't strictly enforce the grammar, so malformed headers are still accepted", "They are binary protocols", "The LLM timed out"], a: 1, why: "If the parser is lenient, keeping messages valid buys less coverage." },
        { q: "Minimal trigger of bug #1 (heap UAF in Live555)?", options: ["SETUP → TEARDOWN", "SETUP → PLAY → PAUSE → PLAY", "DESCRIBE → PLAY", "OPTIONS × 1000"], a: 1, why: "PAUSE frees the track's usage environment, then PLAY uses it. PAUSE wasn't in the original seeds." },
        { q: "ChatAFL vs AFLNet: average improvement in state transitions?", options: ["5.81%", "29.55%", "47.60%", "91%"], a: 2, why: "47.60% transitions, 29.55% states, 5.81% branches. 90.98% is Live555 alone." },
        { q: "Which LLM and temperature were used for plateau breaking?", options: ["GPT-4, 0", "gpt-3.5-turbo, 1.5", "StarCoder, 1.0", "gpt-3.5-turbo, 0.5"], a: 1, why: "0.5 for grammar and enrichment, 1.5 for plateau breaking (following ChatFuzz's finding that 1.5 is optimal for generating new messages)." }
      ] }
  ]
});

/* ======================================================================
   CHAPTER 3: Fuzz4All
   ====================================================================== */
FL.CHAPTERS.push({
  id: "f4a", num: "3", color: "var(--f4a)", title: "Fuzz4All: One Fuzzer, Every Language", venue: "ICSE 2024 · Lisbon",
  blurb: "Instead of building one fuzzer per language, distill the docs into a prompt and let an LLM generate and mutate test programs.",
  paper: "Chunqiu Steven Xia, Matteo Paltenghi, Jia Le Tian, Michael Pradel, Lingming Zhang. Fuzz4All: Universal Fuzzing with Large Language Models. ICSE '24.",
  steps: [
    { id: "u-meet", type: "scene", title: "Meet the Fuzz4All team",
      setting: "UIUC (Urbana-Champaign) and the University of Stuttgart, connected by a long-running collaboration.",
      disclaimer: true,
      lines: [
        { who: "zhang", text: "Look at what it costs to build a compiler fuzzer today. Csmith is more than 80,000 lines of code. Syzkaller has tens of thousands of hand-written rules for system calls." },
        { who: "pradel", text: "And when the language evolves, the fuzzer stays frozen. Csmith supports features only up to C++11." },
        { who: "xia", text: "There's even a study where Csmith ran six months against the latest GCC and Clang and found no new bugs. The compilers have become immune to it." },
        { who: "me", text: "So you'd need a new fuzzer for every language and every version?" },
        { who: "paltenghi", text: "Unless one engine already knows every language. LLMs were trained on billions of code snippets. They've seen C, C++, Go, Java, SMT-LIB, even quantum programs." },
        { who: "tian", text: "Then the fuzzer is mostly prompt management. Our core loop and autoprompting are 872 lines of Python." },
        { who: "xia", text: "One fuzzer for every SUT that takes code as input. Fuzz4All." }
      ] },

    { id: "u-why", type: "lesson", title: "Three challenges of traditional fuzzers",
      html: `
<p>SUTs that take <em>programming or formal languages</em> as input (compilers, runtimes, SMT solvers, API libraries) are the building blocks of all software, so bugs in them spread downstream.</p>
<div class="stack">
<div class="callout"><b>C1: tight coupling to one system and language.</b> Building a fuzzer is very expensive (Csmith &gt;80k LoC) and hard to reuse for another language.</div>
<div class="callout"><b>C2: no support for evolution.</b> Fuzzers built for one language version lose effectiveness on newer versions and can't test new features.</div>
<div class="callout"><b>C3: restricted generation ability.</b> Generators use a subset of the grammar to stay valid. Mutators are limited by their operators and need high-quality seeds.</div>
</div>
<p>What about general-purpose fuzzers like AFL and libFuzzer? Their byte-level mutations are unaware of the language, so they almost never produce a valid program. PolyGlot uses a uniform IR but still has limited mutations.</p>
<h4>The key idea</h4>
<p>Use an <span class="t" data-g="llm">LLM</span> as a <b>universal input generation and mutation engine</b>. The user supplies documents (docs, examples, specs) about the SUT or about one feature. Fuzz4All distills them into a prompt and keeps updating the prompt so outputs stay diverse. It needs <b>no instrumentation of the SUT</b>.</p>
<div class="callout say">"Fuzz4All answers C1 by using one LLM engine for every language, C2 by letting users feed new documentation to test new features, and C3 by drawing on the LLM's pre-training on billions of code snippets to produce diverse, mostly valid programs."</div>` },

    { id: "u-llm", type: "lesson", title: "LLM essentials for this paper",
      html: `
<ul>
<li><b>Architectures:</b> decoder-only (GPT-3, StarCoder), encoder-only (BERT, CodeBERT), encoder-decoder (BART, CodeT5). Instruction-tuned and RLHF models (ChatGPT, GPT-4) follow complex instructions.</li>
<li><b><span class="t" data-g="finetune">Fine-tuning vs prompting</span>:</b> fine-tuning updates weights and needs data and money. Prompting gives a task description, optionally with examples.</li>
<li><b>Classic autoprompting</b> (NLP) uses model <em>gradients</em> to find soft prompts (vectors) or hard prompts (text). Fuzz4All's version is <b>black-box</b>: it just samples GPT-4 and scores prompts on the real downstream task.</li>
<li><b><span class="t" data-g="temperature">Temperature</span></b> 0 is greedy and most likely. Higher is more diverse. <b><span class="t" data-g="nucleus">Top-p</span></b> restricts sampling to the top probability mass.</li>
</ul>
<h4>Two models, two jobs</h4>
<div class="grid2 collapse">
<div class="callout"><b><span class="t" data-g="distill-llm">Distillation LLM M<sub>D</sub></span></b><br>GPT-4 (gpt-4-0613), max_token 500, so the prompt fits the generation model's context. Strong natural-language understanding. Used briefly, only during autoprompting.</div>
<div class="callout"><b><span class="t" data-g="gen-llm">Generation LLM M<sub>G</sub></span></b><br>StarCoder (Hugging Face), trained on 1T+ code tokens in 80+ languages. Temperature 1, batch 30, max length 1,024, top-p 1. Cheap enough to sample continuously.</div>
</div>
<div class="callout story">Why not GPT-4 for everything? Autoregressive inference with a huge model for every fuzzing input would be very slow and expensive. Even with StarCoder, GPU inference was the bottleneck: Fuzz4All produced 43.0% fewer inputs than traditional fuzzers.</div>` },

    { id: "u-auto-l", type: "lesson", title: "Stage 1: autoprompting",
      html: `
<div class="codeblock"><span class="c">// Algorithm 1 — Autoprompting</span>
<span class="k">function</span> Autoprompting(userInput, numSamples):
    greedy ← M_D(userInput, APInstruction, temp=0)
    candidates ← [greedy]
    <span class="k">while</span> |candidates| &lt; numSamples:
        candidates += M_D(userInput, APInstruction, temp=1)
    <span class="k">return</span> argmax_{p ∈ candidates} Scoring(M_G(p), SUT)</div>
<p>The APInstruction: <em>"Please summarize the above information in a concise manner to describe the usage and functionality of the target."</em></p>
<ul>
<li><b>Greedy first</b> (temperature 0): a high-confidence plausible answer, a common trick from program synthesis.</li>
<li><b>Then diverse samples</b> (temperature 1): each is a different distilled summary.</li>
<li><b><span class="t" data-g="scoring">Scoring</span></b>: each candidate generates snippets with M<sub>G</sub>. Score = number of <em>unique, valid</em> snippets: Σ<sub>c∈M_G(p)</sub> isValid(c, SUT).</li>
<li>Settings: <b>4 candidates × 30 snippets</b>. Autoprompting takes about 2.3 minutes on average, counted inside the 24h budget.</li>
</ul>
<p><b>Example (Figure 2):</b> cppreference docs for C++23 <code>std::expected</code>, 498 words and 3,262 characters, became a 214-word, 1,410-character prompt. It groups the near-duplicate descriptions of <code>and_then</code>, <code>transform</code>, <code>or_else</code> and <code>transform_error</code> into one sentence.</p>` },

    { id: "u-auto", type: "sim", title: "Autoprompt Arena", game: "autoprompt",
      intro: "Four candidate prompts distilled from the std::expected docs. Predict which one wins, then run the mini fuzzing experiment that scores them." },

    { id: "u-loop-l", type: "lesson", title: "Stage 2: the LLM-powered fuzzing loop",
      html: `
<div class="codeblock"><span class="c">// Algorithm 2 — Fuzzing loop</span>
genStrats ← [generate-new, mutate-existing, semantic-equiv]
inputs ← M_G(inputPrompt + generate-new)
bugs ← Oracle(inputs, SUT)
<span class="k">while</span> timeElapsed &lt; budget:
    example ← sample(inputs, SUT)        <span class="c">// a VALID input from last batch</span>
    instr   ← sample(genStrats)          <span class="c">// random strategy</span>
    inputs  ← M_G(inputPrompt + example + instr)
    bugs    ← bugs + Oracle(inputs, SUT)</div>
<div class="scrollx"><table class="data">
<tr><th>Strategy</th><th>Instruction (Fig. 3)</th><th>Mimics</th></tr>
<tr><td>generate-new</td><td>"Please create a program which uses complex {SMT2 logic} for an {SMT solver}"</td><td>generation-based fuzzer</td></tr>
<tr><td>mutate-existing</td><td>"Please create a mutated program that modifies the previous generation"</td><td>mutation-based fuzzer</td></tr>
<tr><td>semantic-equiv</td><td>"Please create a semantically equivalent program to the previous generation"</td><td>metamorphic transformation</td></tr>
</table></div>
<p>Why change the prompt each round? Sampling the same prompt over and over gives the same or similar programs. The example shows the kind of code wanted, and the instruction says what to do with it.</p>
<p><b><span class="t" data-g="oracle">Oracles</span>:</b> user-defined. The paper uses crashes (segmentation faults, internal assertion failures). For Qiskit there are two: transpile each circuit at different optimization levels, and export to QASM then re-import.</p>` },

    { id: "u-loop", type: "sim", title: "Fuzzing Loop: SMT", game: "fuzzLoop",
      intro: "Replay Figure 3, where a real CVC5 crash came from generate-new → mutate-existing → semantic-equiv. Pick an example and a strategy each round and run the oracle." },

    { id: "u-setup", type: "lesson", title: "Evaluation setup",
      html: `
<div class="scrollx"><table class="data">
<tr><th>Language</th><th>SUT(s)</th><th>Baselines</th><th>Coverage version</th></tr>
<tr><td>C</td><td>GCC, Clang</td><td>GrayC, Csmith</td><td>GCC-13.1.1</td></tr>
<tr><td>C++</td><td>G++, Clang++</td><td>YARPGen</td><td>G++-13.1.1</td></tr>
<tr><td>SMT2</td><td>Z3, CVC5</td><td>TypeFuzz</td><td>CVC5-1.0.5</td></tr>
<tr><td>Go</td><td>Go toolchain</td><td>go-fuzz</td><td>go-1.20.6</td></tr>
<tr><td>Java</td><td>javac</td><td>Hephaestus</td><td>OpenJDK-javac-18</td></tr>
<tr><td>Python</td><td>Qiskit</td><td>MorphQ</td><td>qiskit-0.43.1</td></tr>
</table></div>
<ul>
<li>RQ1: 24h × 5 runs (autoprompting included). Later RQs: 10,000 generated inputs, and 4 repetitions for the ablation.</li>
<li>Metrics: <span class="t" data-g="line-coverage">line coverage</span>, Mann-Whitney U (* = p &lt; 0.05), <span class="t" data-g="validity">% valid</span> (valid and unique), <span class="t" data-g="hit-rate">hit rate</span> for targeted runs, and bugs.</li>
<li>Valid means: compiles (C, C++, Go, Java), SAT or UNSAT without error (SMT), runs (Qiskit).</li>
<li>Hardware: 64 cores, 256 GB RAM, 4 × RTX A6000 (one GPU per run).</li>
</ul>` },

    { id: "u-results", type: "sim", title: "Results Explorer", game: "f4aResults",
      intro: "Table 2, live. Coverage against validity rate: watch Fuzz4All win on coverage while losing on validity, and figure out why both are true." },

    { id: "u-target", type: "lesson", title: "Targeted fuzzing and ablation",
      html: `
<h4>RQ2: targeted fuzzing</h4>
<p>Give documentation for just one feature: C keywords (typedef, union, goto), C++ built-ins (apply, expected, variant), SMT theories, Go libraries, Java keywords, Qiskit APIs. Average <b>hit rate 83.0%</b>. General fuzzing hits those features <b>96.0% less</b> on average. In Qiskit, general fuzzing had a <b>0%</b> hit rate on the three new APIs, because they are recent and rare in training data. Related features leak into each other (typedef and union), unrelated ones don't (goto).</p>
<h4>RQ3: ablation (10k inputs)</h4>
<div class="scrollx"><table class="data">
<tr><th>Variant</th><th class="num">C cov</th><th class="num">C valid</th></tr>
<tr><td>no input (no initial prompt)</td><td class="num">127,261</td><td class="num">42.57%</td></tr>
<tr><td>raw prompt (user docs as-is)</td><td class="num">137,204</td><td class="num">33.95%</td></tr>
<tr><td>autoprompt</td><td class="num">182,530</td><td class="num">39.09%</td></tr>
</table></div>
<ul>
<li><b>No input</b> gives simple, very valid, low-coverage programs. <b>Raw docs</b> contain irrelevant text, so validity drops. <b>Autoprompt</b> gives the best coverage and better validity than raw.</li>
<li>Fuzzing loop: <b>w/o example</b> repeats itself (8.0% repeated inputs vs 4.7% for full Fuzz4All). <b>w/ example</b> (generate-new only) is better. <b>Full</b> (all 3 strategies) has the highest coverage on every SUT.</li>
</ul>` },

    { id: "u-bugs", type: "sim", title: "Bug Museum", game: "bugMuseum",
      intro: "98 bugs, 64 confirmed as previously unknown. Open the four exhibits from Figure 5 and work out why traditional fuzzers missed each one." },

    { id: "u-limits", type: "lesson", title: "Threats and trade-offs",
      html: `
<ul>
<li><b>Lower validity:</b> 56.0% average reduction vs baselines. Go is strict (unused variables are errors), so only 23.02% is valid. Qiskit is 24.90% because quantum code is rare in training data. Near-valid code still finds bugs in the SUT's validation logic, as in the Clang example.</li>
<li><b>Throughput:</b> GPU-bound, 43.0% fewer inputs.</li>
<li><b><span class="t" data-g="data-shift">Data shift</span>:</b> a frozen StarCoder checkpoint grows stale as languages evolve. Mitigation: fresh documentation via autoprompting.</li>
<li><b><span class="t" data-g="hallucination">Hallucination</span></b> in distillation. A common LLM pipeline risk, left for future work.</li>
<li><b>Internal validity:</b> code reviews and testing. Baselines run from their replication packages. <b>External validity:</b> 9 SUTs × 6 languages, 5 repeated 24h runs, significance tests.</li>
<li><b>Simple oracles:</b> crashes and assertions only in the paper. Differential oracles (e.g., -O0 vs -O2) are possible but not the focus. So miscompilations are mostly out of scope.</li>
</ul>` },

    { id: "u-recap", type: "lesson", title: "Your 60-second Fuzz4All answer",
      html: `
<div class="callout say"><b>Problem.</b> Fuzzers for compilers, solvers and runtimes are tied to one language and one version (C1, C2) and generate a restricted slice of the language (C3). Csmith alone is over 80k LoC.<br><br>
<b>Idea.</b> Use LLMs as a universal generation and mutation engine for any SUT that takes code as input.<br><br>
<b>Autoprompting.</b> GPT-4 distills user docs into candidate prompts (one greedy at temp 0, others at temp 1). Each is scored by how many unique valid snippets StarCoder generates, and the best is kept.<br><br>
<b>Fuzzing loop.</b> Each iteration adds a valid example from the last batch and a random strategy (generate-new, mutate-existing, semantic-equiv) to the prompt, so outputs stay diverse. A user-defined oracle (crashes) checks each input.<br><br>
<b>Results.</b> 6 languages, 9 SUTs. Highest coverage everywhere, +36.8% on average (javac +60.9%, Qiskit +75.6%), despite lower validity and fewer inputs. Targeted hit rate 83%. 98 bugs, 64 confirmed new.<br><br>
<b>Limits.</b> GPU throughput, validity, data shift, hallucination, simple oracles.</div>` },

    { id: "u-quiz", type: "quiz", title: "Fuzz4All checkpoint",
      qs: [
        { q: "What does 'universal' mean in Fuzz4All?", options: ["It fuzzes any binary", "It targets many input languages and many features of those languages", "It runs on every OS", "It uses every LLM"], a: 1, why: "C, C++, Go, SMT2, Java and Python (Qiskit): 6 languages, 9 SUTs." },
        { q: "How is the best autoprompt chosen?", options: ["Shortest prompt", "Highest number of unique valid snippets generated by M_G", "GPT-4 rates it", "Highest coverage after 24h"], a: 1, why: "The scoring function Σ isValid(c, SUT) is lightweight and general, and valid inputs reach deep logic." },
        { q: "Why two different LLMs?", options: ["Redundancy", "A big model (GPT-4) understands docs once. A smaller one (StarCoder) generates cheaply and continuously", "Licensing", "One per language"], a: 1, why: "It balances quality against inference cost. GPU inference is still the throughput bottleneck." },
        { q: "Which is NOT a Fuzz4All generation strategy?", options: ["generate-new", "mutate-existing", "semantic-equiv", "grammar-mutate"], a: 3, why: "Grammar-guided mutation is ChatAFL's strategy SA." },
        { q: "Why does the loop add an example to the prompt each iteration?", options: ["To save tokens", "To avoid sampling the same distribution, which repeats outputs (8.0% vs 4.7% repeats)", "Required by StarCoder", "To compute coverage"], a: 1, why: "The example shows the desired kind of code. The instruction says what to do with it." },
        { q: "Fuzz4All's validity rate vs baselines is…", options: ["Higher", "Lower (56.0% average reduction), yet coverage is higher", "Identical", "Not measured"], a: 1, why: "Diversity matters more than validity. Near-valid inputs also stress validation logic." },
        { q: "Average coverage improvement over the best baselines?", options: ["5.8%", "26.45%", "36.8%", "75.6%"], a: 2, why: "36.8% on average. 75.6% is Qiskit vs MorphQ, 60.9% is javac vs Hephaestus." },
        { q: "Why could MorphQ not find the Qiskit 'crz' bug?", options: ["It was too slow", "Its templates use only anonymous registers. Fuzz4All named a register 'crz', which clashes with a QASM operation", "It doesn't support Python", "It lacked an oracle"], a: 1, why: "The LLM's domain knowledge injected a meaningful string literal, which broke the QASM export/import round trip." },
        { q: "How many bugs did Fuzz4All report, and how many confirmed as previously unknown?", options: ["20 / 8", "9 / 7", "98 / 64", "64 / 98"], a: 2, why: "98 total. 64 confirmed unknown, 26 confirmed known, 6 pending, 2 won't fix." },
        { q: "Main external threat the authors name about the LLM?", options: ["GPU cost", "Data shift: the StarCoder checkpoint may become outdated", "Licensing", "Prompt length"], a: 1, why: "Mitigated by supplying up-to-date documentation through autoprompting." }
      ] }
  ]
});

/* ======================================================================
   FINALE: DEFENSE DAY
   ====================================================================== */
FL.CHAPTERS.push({
  id: "final", num: "★", color: "var(--final)", title: "Defense Day", venue: "Compare · contrast · defend",
  blurb: "Put the three papers side by side, sort the claims, and face the doctor's questions.",
  steps: [
    { id: "z-scene", type: "scene", title: "The night before",
      setting: "Your desk. The three PDFs, now covered in notes.",
      lines: [
        { who: "ada", text: "Tomorrow the doctor won't ask you to recite numbers. They'll ask you to think: compare the papers, find the weak spots, defend a design choice." },
        { who: "me", text: "So I need the big picture." },
        { who: "ada", text: "Here it is. All three attack the same question: how do we generate inputs that reach deeper code? They put the intelligence in different places." },
        { who: "ada", text: "FOX puts it in mathematics: optimal control and Newton steps. ChatAFL puts it in an LLM's knowledge of protocol specs. Fuzz4All makes the LLM the generator itself." },
        { who: "me", text: "Math inside the loop, LLM next to the loop, LLM as the loop." },
        { who: "ada", text: "Say it exactly like that tomorrow." }
      ] },

    { id: "z-compare", type: "sim", title: "The Comparison Matrix", game: "compareMatrix",
      intro: "Tap a dimension to compare all three papers on it. These are the comparisons examiners ask for most often." },

    { id: "z-sort", type: "sim", title: "Which Paper Said It?", game: "paperSorter",
      intro: "A rapid-fire sorting game. Each statement comes from exactly one paper. Assign it." },

    { id: "z-critique", type: "lesson", title: "Critical questions to prepare",
      html: `
<p>Examiners test judgement as well as recall. Prepare a 2–3 sentence answer for each:</p>
<h4>FOX</h4>
<ul>
<li><b>"Is greedy really optimal?"</b> Only given fixed, accurate flip-probability estimates. The proof is an exchange argument under that assumption, and the paper itself says efficacy depends on estimate accuracy.</li>
<li><b>"Why is δ-decrease a good proxy?"</b> Every flip implies a decrease, so it's an upper bound. It's frequent, so it's measurable. But a decrease doesn't mean progress toward a feasible flip: pathological branches keep shrinking δ and never flip.</li>
<li><b>"Would FOX help on crypto-heavy parsers?"</b> Probably less. Checksums and hashes are non-convex, and Newton's method needs local linearity. Combining it with checksum-aware techniques would be future work.</li>
</ul>
<h4>ChatAFL</h4>
<ul>
<li><b>"Is response-code-as-state a good state model?"</b> It's coarse: two different internal states can return the same code. It's what AFLNet and ProFuzzBench use, so the comparison is fair, but state counts depend on it. NSFuzz and SGFuzz use state variables instead.</li>
<li><b>"Could the LLM have memorized the benchmark?"</b> It learned RFCs, which is the point. The bugs found are new, so this isn't test leakage, but generalization to proprietary protocols is untested.</li>
<li><b>"Reproducibility?"</b> gpt-3.5-turbo changes over time and sampling is random. They mitigate with self-consistency and 10 repeated runs.</li>
</ul>
<h4>Fuzz4All</h4>
<ul>
<li><b>"Is line coverage fair across tools that generate far more inputs?"</b> Fuzz4All generates fewer inputs and still wins, which strengthens the claim. But coverage is a proxy, so they also report 98 bugs.</li>
<li><b>"What about miscompilations?"</b> The paper uses crash oracles, so silent wrong-code bugs are mostly out of scope. A differential oracle would be needed.</li>
<li><b>"Why is it called a fuzzer if it uses no feedback?"</b> It's an LLM-driven generation and mutation loop with an oracle. Unlike greybox fuzzers it doesn't use coverage to guide generation, which is a possible extension.</li>
</ul>
<h4>Cross-cutting</h4>
<ul>
<li><b>"Combine two of these?"</b> For example, FOX's frontier-branch scheduler with ChatAFL's grammar-aware messages, or Fuzz4All's generation guided by FOX-style coverage feedback.</li>
<li><b>"Which evaluation is most convincing?"</b> ChatAFL's has strong attribution because it's built inside AFLNet. FOX's is the largest (6 CPU-years, 38 programs, significance tests). Fuzz4All's breadth (6 languages) supports the universality claim.</li>
</ul>` },

    { id: "z-final", type: "quiz", title: "Final exam (mixed)",
      qs: [
        { q: "Which paper does NOT require instrumenting the SUT?", options: ["FOX", "ChatAFL", "Fuzz4All", "All require it"], a: 2, why: "Fuzz4All is driven by LLM generation and an oracle. FOX needs an LLVM pass. ChatAFL inherits AFLNet's coverage instrumentation." },
        { q: "Which paper's main contribution is a mathematical reformulation of the fuzzing loop?", options: ["FOX", "ChatAFL", "Fuzz4All", "None"], a: 0, why: "Online stochastic control, with Theorem 1 on greedy optimality." },
        { q: "Both ChatAFL and Fuzz4All use temperature deliberately. Which pairing is right?", options: ["ChatAFL 1.5 for plateau messages; Fuzz4All 0 then 1 for autoprompt candidates", "Both always 0", "ChatAFL 0; Fuzz4All 2", "Neither mentions temperature"], a: 0, why: "ChatAFL: 0.5 grammar and seeds, 1.5 plateau. Fuzz4All: greedy 0 then 1 for candidates, generation at 1." },
        { q: "Which baseline appears in FOX's evaluation?", options: ["AFLNet", "AFL++ with cmplog and dictionary", "Csmith", "MorphQ"], a: 1, why: "FOX compares with AFLPP, AFLPP+C and AFLPP+CD. AFLNet is ChatAFL's baseline. Csmith and MorphQ are Fuzz4All's." },
        { q: "Self-consistency (majority voting) is used by…", options: ["FOX", "ChatAFL", "Fuzz4All", "All three"], a: 1, why: "ChatAFL repeats grammar extraction 5 times. Fuzz4All samples multiple candidates but scores them by validity." },
        { q: "'Coverage plateau' is a trigger for an LLM call in…", options: ["FOX", "ChatAFL", "Fuzz4All", "None"], a: 1, why: "ChatAFL calls the LLM when PlateauLen > MaxPlateau. Fuzz4All observes that baselines plateau while it doesn't." },
        { q: "Which statistic is shared by FOX and Fuzz4All for significance?", options: ["Pearson r", "Mann-Whitney U test", "Chi-square", "ANOVA"], a: 1, why: "Both mark p < 0.05 results. ChatAFL reports Vargha-Delaney Â12 as an effect size." },
        { q: "The number '58.20%' refers to…", options: ["FOX's control-space reduction at 24h", "ChatAFL's state gain", "Fuzz4All's validity", "FOX's coverage gain"], a: 0, why: "Frontier branches vs AFL++ seeds: 49.18% at 12h, 58.20% at 24h." }
      ] }
  ]
});
