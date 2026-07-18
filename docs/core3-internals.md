# Core3 Internals

An engineer's map of how a patch becomes sound. Not a tutorial.

---

## 1. Overview

Three stages, three representations:

- **Eval** builds a pure object graph. Running the patch function constructs plain node objects; nothing executes DSP.
- **Compile** turns that graph into a serializable `Program`.
- **An Engine** interprets the `Program` one sample at a time.

Two hosts run the same Engine. An offline renderer runs it headless and is what every test uses. An AudioWorklet host runs it for live playback. The Engine is identical in both; only the surrounding I/O differs.

---

## 2. The pipeline: runEval → collect → expand → compile → Program → engine

`runEval(fn)` binds an eval context `{ roots, clock, seed }`. Inside, module factories, `clock`, `loop`, and `p` construct pure nodes shaped `{ module, inputs, config, width, pin? }`. A node's `inputs` reference other node objects directly — **object identity is node identity**, so sharing a variable across two consumers is fan-out, not duplication. `out()` pushes a root onto `roots`. Node IDs are assigned at collection, not construction.

`compile(evalResult)` then runs, in order:

1. **`collect`** — walk the object-identity graph from roots to find reachable nodes. Cycles are fine at this stage.
2. **`expandPatterns`** — pattern-valued inputs become `patsig` nodes wired to the ambient clock's phase.
3. **`resolveAmbientClocks`** — unconnected phase-unit `clk` inputs bind to the ambient clock.
4. **re-collect** — `patsig` and ambient-clock nodes introduced above are new; collect again.
5. **`cutZ1Edges`** — connections into `z1` nodes become z-edges (the unit-delay marker).
6. **`toposort`** — z-edges are cut first; a cycle with no z1 in it is a loud error.
7. **`resolveWidths`** — max-input-width fixpoint. A reduce-policy node collapses to width 1. Lane broadcast is `lane % srcWidth`.
8. **index by topo position**, compute `structuralIds`, then **`emit`** → per-lane `PortSrc` resolution → `PNode[]` → `Program { nodes, outs, seed }`.

Config keys prefixed `__` are compile hints and are stripped from the shipped Program. A required input — `def: null`, not optional — left unconnected is a loud compile error.

---

## 3. Width and lanes

Width is the static polyphony dimension, fixed at compile time. A `PNode` carries a `width` and a per-lane `lanes[lane][port]` map of `PortSrc`.

`PortSrc` kinds:

- **`c`** — constant.
- **`n`** — connection (node index + port + lane).
- **`z`** — cycle-cut connection; reads the previous sample.
- **`l`** — stringified user lambda.

Map-policy modules tick per lane. Reduce-policy modules (`mix`, `out`) see all lanes at once — a `Float32Array` per port — and emit a single lane. Broadcast: a width-1 source feeding a width-n consumer applies to every lane via `lane % srcWidth`.

---

## 4. z-edges

Feedback is legal only when every cycle passes through a `z1` unit delay; the `loop` combinator inserts one. Compile marks the back-edge as a `z` `PortSrc` and cuts it before toposort, so the remaining graph sorts as a DAG. At runtime a `z` source reads the node's previous-sample output buffer — the engine double-buffers to make this well-defined. A cycle with no `z1` is a loud error.

---

## 5. Structural-id migration

Live re-eval keeps running state — oscillator phase, delay lines, envelope position, seq cycle — by matching nodes structurally across edits.

`id(node) = fnv1a(module | config-JSON | recursive source ids)`, computed in topo order so every dependency already has an id when the node is hashed. Z-edge sources are described shallowly (`module:port`) to keep the recursion well-founded across cycles.

Editing a node's config changes its id and, recursively, every downstream id. So a config edit resets that node and everything after it — this is by design (a non-recursive variant is a backlog tradeoff). `x.id("name")` pins a `pin` that overrides the structural id, letting state survive a structural change. State is plain serializable data, so migration is clone-and-carry: `deepClone` per lane.

---

## 6. Worklet host

A thin adapter around the same `Core3Engine`. The module registry ships inside the worklet bundle via a direct `import "../modules/all"` — library DSP code lives in the audio thread and is never serialized as strings. Only user lambdas cross the boundary, stringified as `(state, sr, time) => number`.

A graph swap builds a new Engine seeded from the previous `EngineState` and equal-power crossfades over roughly 100 ms, with both engines ticking during the fade. The offline renderer (`render`, `renderTap`) is the same Engine with no worklet attached — which is how everything integration-tests headlessly.

---

## 7. Per-cycle pattern query

Patterns are serializable data — an AST. `query(pat, span, { seed, path })` interprets them. `path` mixes `(op, childIndex)` hashes on descent, giving every AST position a stable integer identity; that is the basis for deterministic `?`/`degrade` via `hash01(seed, path, cycle)`.

The `seq` module, each time the clock phase crosses a cycle boundary, queries its pattern for that one cycle, packs simultaneous events into lanes (`packLanes`), and caches per-lane event lists in state (double-buffered, no steady-state allocation). Per sample it binary-searches the current event to emit pitch/gate/trig. `patsig` does the same for a single value stream. `patstep` flattens onset values once and advances by trigger.

Alternation, `every`, and `iter` are pure functions of the cycle number — never visit-counting — so the sequencer is fully scrubbable.
