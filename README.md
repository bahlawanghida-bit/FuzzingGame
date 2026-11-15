# Fuzz Lab Chronicles

A story-driven, mobile-first learning game for three fuzzing research papers:

| Chapter | Paper | Venue |
|---|---|---|
| 1 · FOX: The Control Room | *FOX: Coverage-guided Fuzzing as Online Stochastic Control* (She, Storek, Xie, Kweon, Srivastava, Jana) | ACM CCS 2024 |
| 2 · ChatAFL: The Protocol Whisperer | *Large Language Model guided Protocol Fuzzing* (Meng, Mirchev, Böhme, Roychoudhury) | NDSS 2024 |
| 3 · Fuzz4All: One Fuzzer, Every Language | *Fuzz4All: Universal Fuzzing with Large Language Models* (Xia, Paltenghi, Tian, Pradel, Zhang) | ICSE 2024 |

You play a new research intern. You meet each team (in dramatized scenes grounded in the papers), learn the vocabulary, run the algorithms yourself in simulations, and finish with a **Defense Day** where an examiner grills you.

## What's inside

- **5 chapters, 67 steps**: Bootcamp (fuzzing 101) → FOX → ChatAFL → Fuzz4All → Defense Day.
- **19 hands-on simulations**, including:
  - *Mutation Lab*: blind vs coverage-guided fuzzing cracking `"BUG!"`.
  - *Frontier Finder*: tap the frontier nodes of a CFG.
  - *Branch Distance Dial*: FOX's Table 1, live (including the row-1 sign discrepancy worth mentioning in a viva).
  - *Scheduler Showdown*: FOX's PT/TT/SC greedy scheduler vs round-robin, averaged over 300 random worlds, with an optional pathological branch.
  - *Newton's Leap*: local search + Newton step on linear, convex and checksum branches.
  - *Hot Byte Hunter*: FOX's adjacency trick for `strncmp`.
  - *Live555 Simulator*: the RTSP state machine from ChatAFL's Figure 2. Reproduce bug #1 (SETUP → PLAY → PAUSE → PLAY).
  - *Grammar Painter*, *Majority Vote*, *Seed Enrichment* and *Plateau Breaker*: ChatAFL's three strategies.
  - *Autoprompt Arena*, *Fuzzing Loop (SMT)* and *Bug Museum*: Fuzz4All's pipeline and its Figure 5 bugs.
  - Results explorers built from the papers' real tables.
- **Checkpoint quizzes** with explanations after every chapter.
- **Glossary**: ~100 terms, phrased the way you'd say them aloud. Tap any dotted word in a lesson.
- **Viva Drill**: 47 oral-exam questions (recall, explain, critique) with model answers, key points and spaced repetition.
- XP, ranks and badges. Progress is saved in your browser.

## Play

- **On your phone:** open `index.html`, or host it with GitHub Pages (Settings → Pages → Deploy from branch → root). On iOS/Android use "Add to Home Screen" to install it like an app. It works offline after the first load.
- **Locally:** just open `index.html` in any browser. No build tools or server needed.

## Develop

Sources live in `src/` (plain JS, no framework):

```
src/content/   glossary, cast, chapters (story + lessons + quizzes), viva bank
src/games/     the simulations
src/app.js     navigation, progress, XP, glossary and viva screens
src/styles.css design tokens (light + dark)
```

Rebuild the single-file game after editing:

```sh
python3 build.py   # writes index.html (and dist/artifact.html)
```

## Accuracy note

Numbers, names, affiliations, algorithms and quoted phrases come from the three papers. Dialogue is dramatized and labelled as such. Simulations are simplified teaching models, and the places where numbers are illustrative say so on screen.
