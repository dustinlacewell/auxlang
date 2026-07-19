---
id: "wasm-backend-prototype-2026-07-19"
status: "backlog"
priority: "low"
assignee: null
dueDate: null
created: "2026-07-19T12:04:00.000Z"
modified: "2026-07-19T12:04:00.000Z"
completedAt: null
labels: ["performance", "wasm", "spike"]
order: "a4"
---

# WASM backend prototype (gated: only if codegen isn't enough)

## Gate — read first

Do NOT start this until BOTH are true:

1. The codegen driver card shipped and its measured speedup is recorded.
2. Real patches still overrun render quanta (per the instrumentation card's
   numbers) with codegen on and queries off the audio thread.

If the earlier cards fixed the crackle, this card stays in backlog. WASM's
extra build tooling, debugging opacity, and hot-swap friction are only worth
paying for measured, still-standing overruns. (Rationale: JS codegen typically
lands within 2–4× of native; the crackle was GC-driven, not raw-CPU-driven.)

## Context

core2 had a WASM device mechanism (AssemblyScript in `native/assembly/`,
wrappers with `wasmUrl` — see the `wasm-devices` rule file; it explicitly notes
WASM on the **core3** module contract is backlog, tracked in
`llm/core3-backlog.md`). Nothing of it is wired into core3. core3's module
contract is per-sample `tick(state, ins, outs, config, sampleRate)` with
serializable state — a shape that maps cleanly onto linear memory.

## Scope: a spike, not the full backend

Prototype ONE hot module — the reverb (highest per-sample work: 8 combs + 4
allpasses) — as WASM behind the registry, and measure. Deliberately narrow:

1. **AssemblyScript implementation** of the Freeverb tick in
   `native/assembly/` (port the exact arithmetic from
   `src/core3/modules/reverb.ts`; the tuning constants and operation order
   must match — the goal is a drop-in, not a redesign). State (comb/allpass
   buffers, indices, damp stores) lives in WASM linear memory, laid out by an
   `init(sampleRate)` export; per-sample entry is
   `tick(in, room, damp, mix) -> f32`.
2. **A core3 wrapper**: a module registered under a test name (`reverbw`) whose
   JS `tick` calls the WASM export. State serialization for migration: expose
   `saveState()`/`loadState(bytes)` copying linear memory to/from a
   `Uint8Array` held in the serializable state object — this keeps the module
   contract (typed-array view) satisfied and hot-swap alive.
3. **Instantiation path**: the worklet must instantiate the WASM module before
   first tick. Decide: compile in the host and transfer the `WebAssembly.Module`
   to the worklet (structured-cloneable), instantiate there. Document whatever
   path is chosen in the card on completion.
4. **Measure**: scratch benchmark (`src/tests/scratch/`, `npx tsx` — note
   node's WASM works fine headless) rendering a reverb-heavy patch:
   JS reverb vs WASM reverb, samples/sec. Also verify output is within
   float tolerance (WASM f32 vs JS f64 intermediates WILL differ in low bits —
   bit-identity is NOT achievable here; assert max sample delta < 1e-5 and
   document that this backend trades bit-determinism for speed, which is why
   it must stay opt-in per module).

## Decision output

Write the verdict into `llm/core3-backlog.md`: speedup factor, whether the
determinism tradeoff is acceptable, and whether to proceed to (a) more modules,
(b) whole-graph compilation (concat module bodies → single WASM instance,
the original idea — only worth designing if per-module WASM shows the
JS↔WASM call boundary is NOT the bottleneck), or (c) stop and keep JS codegen.

## Gotchas

- The per-sample JS↔WASM boundary call has real overhead (~10-30 ns); for tiny
  modules it can ERASE the win. That's why the spike uses the reverb (much
  work per call). Whole-graph WASM eliminates the boundary but sacrifices the
  live-reeval ergonomics — measure before designing that.
- Determinism is a project invariant (bit-identical renders, scrub-safe).
  A WASM module breaks bit-identity with the JS reference. The registry entry
  must be a SEPARATE name (or explicit opt-in flag), never a silent swap, and
  tests comparing renders must use tolerance, not equality.
- Keep the AssemblyScript build out of the main `npm run build` until adopted;
  a separate script in `native/` (mirroring core2's `build:*` pattern) is fine.

## Done when

Benchmark numbers and a go/no-go recommendation are recorded in
`llm/core3-backlog.md`; the spike branch/files are either promoted or removed
(no half-wired WASM lingering in the registry).
