# Engine Internals

An engineer's map of how a patch becomes sound. Not a tutorial.

---

## 1. Overview

Three stages, three representations:

- **Eval** builds a pure object graph. Running the patch function constructs plain node objects; nothing executes DSP.
- **Compile** turns that graph into a serializable `Program`.
- **An Engine** runs the `Program` one sample at a time.

Two engines run a `Program`, and they agree bit for bit. The interpreter (`InterpreterEngine`) is the reference: the offline renderer runs it headless, and every test holds the other engine against it. The WASM engine (`apps/site/src/engine/wasm/`) compiles the whole program to one WebAssembly module and is what the AudioWorklet host plays.

---

## 2. The pipeline: runEval → collect → expand → compile → Program → engine

`runEval(fn, { seed })` binds an eval context `{ roots, clock, seed, seedPinned }`. Inside, module factories, `loop`, and `p` construct pure nodes, shaped `{ module, inputs, config, width, pin?, seed? }`; `tempo(bpm)` records the ambient clock and `seed(n)` pins the seed over the option. A node's `inputs` reference other node objects directly — **object identity is node identity**, so sharing a variable across two consumers is fan-out, not duplication. `out()` pushes a root onto `roots`. Node IDs are assigned at collection, not construction.

Before eval, the shell (`engine/eval-patch.ts`) runs the source-location rewrite (`engine/source/rewrite/`): a pure function of the code that lists every call, number and pattern token with its range and wraps each call in a trace, so a node records the site of the call that made it (`site`, `bindingSites`), pattern leaves and their events record their token's site, and a loud error records the code it names (`sourceRange`). Sites are metadata: not identity, not constants.

`compile(evalResult)` then runs, in order:

1. **`collect`** — walk the object-identity graph from roots to find reachable nodes. Cycles are fine at this stage.
2. **`expandPatterns`** — pattern-valued inputs become `seq(pattern).out` nodes with no position (patterns as knobs); re-collect.
3. **`prepareSeqs`** — each seq's pattern config becomes voiced Pat data with its lane count, a `__minWidth` hint, and the program seed.
4. **`resolveAmbientClocks`** — unconnected phase-unit inputs (a seq's `position`, a tempo converter's `clk`) bind to the ambient clock's position output (in bars; the ambient clock is the eval's one `tempo(bpm)` setting). **`markClocked`** then sets `clocked` on seqs read straight from a clock, and **`copyMeter`** copies the clock's `beatsPerBar` into the beats↔secs converters that read it.
5. **re-collect** — the ambient clock may be new; collect again.
6. **`cutZ1Edges`** — connections into `z1` nodes become z-edges (the unit-delay marker).
7. **`toposort`** — z-edges are cut first; a cycle with no z1 in it is a loud error.
8. **`resolveWidths`** — max-input-width fixpoint. A reduce-policy node collapses to width 1. Lane broadcast is `lane % srcWidth`.
9. **index by topo position**, compute `identities` (kind and place), then **`emit`** → per-lane `PortSrc` resolution → `PNode[]` → `Program { nodes, outs, seed }`.

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

## 5. Re-eval matching and migration

Live re-eval keeps running state — oscillator phase, delay lines, envelope position, seq cycle — by matching each new node to a running one. Rewiring resets nothing.

Compile gives each node a `kind` and a `place` (`compile/identities.ts`). The kind is the module type; a patch-defined module adds a hash of its tick and state source. The place hashes the kind and the node's first path of (input port, module) hops from an `out` root, breadth-first, ports in name order. Constants, lambdas, config, and wiring are not identity.

The engine matches with `runtime/match.ts`, a pure reconciler over the old engine's identities (carried in `EngineState.identities`) and the new nodes. Passes: `.id()` pins, then place with the same upstream signature (a recursive hash of the module types and ports feeding the node; constants, config and lambdas excluded — `compile/upstream-signatures.ts`), then place, then kind. The upstream pass only breaks ties among nodes sharing a place, so swapped parallel chains keep their own state. Inside it, candidates still tied pair by the most shared constant evidence (hashes of the constants and config on the node and upstream of it — `compile/constant-evidence.ts`), so deleting one of two near-identical chains leaves the survivor its own state. Constants are still not identity: they only order candidates that already tie. Chains identical in every constant fall back to code order. Each pass pairs the k-th new node with the k-th leftover old node, in program order. Keys (`state-keys.ts`) follow the match: a pin, else the paired old key, else the place, with a `~k` suffix for duplicates. A fresh patch therefore keys from the graph alone, and random streams seed from the key.

A matched node keeps its state whenever the carried state fits the fresh state's shape: same keys, value kinds, and array lengths (`module/front/state/shape-fits.ts`, over the shapes `state-shape-of.ts` derives; the WASM carry compares the same shapes). Config is not consulted, so module state must not cache values derived from config; a config edit that resizes state resets that module through its shape. A sample-rate change migrates nothing. State is plain serializable data, so migration is clone-and-carry: `deepClone` per lane. Each lane also gets two engine fields outside the shape: `__lane` and `__scratch`, a record for derived data (seq's event tables) that every engine starts empty.

---

## 6. Worklet host

The main thread prepares each program (`runtime/prepare/prepare-wasm-program.ts`): it matches it against the running one, compiles it to a WebAssembly module, warms a throwaway instance so the module's code is compiled before the worklet runs it, and plans the carry (which bytes of the old memory the new one takes over). It posts the compiled `Module` with plain data. The module registry ships inside the worklet bundle via a direct `import "../library/all"`; the worklet builds the program's start values from the same registry.

The worklet host (`runtime/worklet/live-host.ts`) builds the new program a budget at a time while the old one plays: instantiate, write the start values into memory, prefill the seq tables. At a block boundary it swaps: the carry copies along the plan, and an equal-power crossfade runs over roughly 100 ms, with both engines rendering during the fade. The offline renderer (`render`, `renderTap`) is the interpreter with no worklet attached — which is how everything integration-tests headlessly.

---

## 7. Per-cycle pattern query

Patterns are serializable data — an AST. `query(pat, span, { seed, path })` interprets them. `path` mixes `(op, childIndex)` hashes on descent, giving every AST position a stable integer identity; that is the basis for deterministic `?`/`degrade` via `hash01(seed, path, cycle)`.

Pattern width is computed from structure, not by querying (`stack` sums, sequences and `every` take the max, `off`/`chunk` sum). Lane numbering follows the same structural rule a query assigns at runtime, so a held note keeps its lane across cycle edges. The `seq` module reads a pattern at a position signal; lane `l` reads pattern lane `l % lanes`. Each lane keeps an event table (`pattern/table/`) in its scratch: the cycle under the position as contiguous rows (rest rows fill gaps), each with a note id (the onset of its note; a tie keeps its note's), plus the carry from earlier cycles and the dip marks between touching notes. `fillTable` refills it when the position leaves its cycle; the seq tick walks or searches to the row. seq is a plain subset `defmod` (`modules/lib/timing/seq.js`) that reads its lane's table through the table intrinsics (`module/front/intrinsics/table-intrinsics.ts`); its helpers turn the row and the reader's fixed-shape state (row, note id, gate, dip countdown, last position) into `out`/`gate`/`trig`. A pattern used as a knob is the same `seq`.

Alternation, `every`, and `iter` are pure functions of the cycle number — never visit-counting — so the sequencer is fully scrubbable.
