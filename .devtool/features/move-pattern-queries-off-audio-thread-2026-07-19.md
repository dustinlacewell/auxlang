---
id: "move-pattern-queries-off-audio-thread-2026-07-19"
status: "backlog"
priority: "low"
assignee: null
dueDate: null
created: "2026-07-19T12:01:00.000Z"
modified: "2026-07-19T12:12:18.000Z"
completedAt: null
labels: ["performance", "audio-thread", "architecture"]
order: "a1"
---

# Move pattern queries off the audio thread (prefetch cycle tracks)

## ⚠️ LIKELY OBVIATED by a2 — do NOT build without re-measuring first

This card targeted a beat-boundary GC spike. After a2 (reverb flatten) shipped,
re-measuring coastline showed that spike **gone** (overrun rate 6.9 % → 0.6–2.3 %,
beat-frac histogram now flat — see `llm/handoffs/performance-findings.md`). The
reverb string-allocation was the real cause, not the seq queries.

**Gate before building:** re-run the a0 harness on **real (non-headless) Chrome**
(sub-ms `performance.now`). If overruns are flat / no beat-aligned spike, CLOSE
this card as obviated. Only build the worker if a residual beat-boundary spike is
confirmed on real Chrome. If nothing is beat-aligned but the mean quantum still
bothers the ear, prefer **a3 (codegen driver)** — it attacks the flat steady
per-sample cost, which is what's left.

**Design is ready** (read-only pass done 2026-07-19), so if measurement
resurrects the need, implementation can start from a spec. Key decisions surfaced
but NOT yet made (they only matter if we build): (1) prefetch cache lives in an
engine/processor hook [pure state] vs a Symbol-keyed live field [contract bend];
(2) an AudioWorklet cannot spawn a Worker — the prefetch worker must live on the
main thread and post transferable track buffers into the worklet over the port;
(3) `patsig` shares the mechanism but needs a `sort` mode (it does NOT use
`packLanes` like seq — that distinction is required for byte-identity);
(4) prime cycle 1 on swap so the first bar boundary hits cache. Full design in
the session transcript / findings doc.

## Problem

`src/core3/modules/seq.ts` (and `patsig`) call `query()` on the audio thread
whenever the clock phase crosses a cycle boundary (`tick`, the
`cycle !== s.cycle` branch). `query()` is allocation-heavy: every rational op
(`src/core3/pattern/rational.ts`) returns a fresh `{n,d}` object, every event a
fresh object, and ops like `rev`/`ply`/`degrade` spread-copy events. A bar
boundary with many voices dumps thousands of short-lived objects into one
2.67 ms render quantum → GC pause → crackle. This is the prime suspect for the
intermittent crackling on nontrivial patches (verify with the instrumentation
card first if not yet done).

## Design

Prefetch the NEXT cycle's packed lane data off the audio thread, so the
worklet's seq tick only ever reads precomputed flat arrays.

Key facts that make this safe and easy:

- Everything a query needs is serializable and already crosses threads:
  `node.config.pattern` is pure `Pat` data, `node.config.seed` a number. A
  worker holding the same compiled `Program` can compute **bit-identical**
  results — `query` is a pure function of `(pattern, span, seed)`; all
  randomness is `hash01(seed, path, …)`, no thread-local state.
- The seq state already caches a cycle as flat arrays: see
  `fillTrack`/`advanceTrack`/`trackStateFields` in
  `src/core3/modules/pattern-track.ts`. The per-sample path never touches
  events — only `evStart`/`evEnd`/`evVal`/`evHold` Float64/Int8 arrays. The
  prefetcher just needs to deliver the same arrays one cycle early.

## Implementation sketch

1. **Extract a pure "cycle track" builder**: a function
   `buildCycleTracks(pattern, seed, cycle, lanes)` that runs
   `query(pattern, [cycle, cycle+1), {seed, path:0})` + `packLanes` and returns,
   per lane, the flat arrays in exactly the `fillTrack` layout. Both the
   worklet fallback and the worker call THIS function — one source of truth,
   no drift. Lives in `src/core3/modules/` or `src/core3/pattern/` next to
   `pattern-track.ts`.
2. **Worker side**: a small module (plain Worker or reuse of the main thread —
   worker preferred) that receives the Program once, then messages of
   `{nodeIndex, cycle}` and replies `{nodeIndex, cycle, tracks}` with the
   arrays as transferables.
3. **Worklet side**: seq state gains a one-slot prefetch cache per lane
   (`nextCycle`, `nextTracks`). At each cycle crossing:
   - If the cache holds the entering cycle → swap it in (pure array copies into
     the existing state fields; no allocation) and post a request for
     `cycle+1`.
   - If not (first cycle after eval, scrub/seek, or worker lag) → fall back to
     the in-thread query exactly as today. Correctness never depends on the
     worker; it is an optimization layer.
4. **Priming**: when a program is (re)loaded into the worklet, the host
   immediately requests cycle 0 and 1 tracks for every seq/patsig node so even
   the first boundary hits the cache.
5. **Messaging discipline**: requests are tiny; replies transfer their buffers.
   Never post per-sample; only at cycle crossings (one message per seq node per
   cycle — at 180 bpm that's 3/sec/node, trivial).

## What NOT to change

- `src/core3/runtime/render.ts` (offline/headless) stays fully synchronous —
  it uses the in-thread path. All existing tests must pass untouched.
- Determinism/scrub-safety: cached tracks must be byte-identical to what the
  in-thread query would produce (same function ⇒ guaranteed). Add a test that
  builds tracks via the extracted builder and via a live seq state after one
  cycle, and asserts identical arrays.
- Do not restructure `query()` itself in this card (pooling rationals etc. is a
  separate optimization; this card makes its cost irrelevant to audio).

## Verification

- All existing core3 tests green (`npx vitest run src/tests/core3`).
- New test: builder output === in-thread `fillTrack` result for several
  patterns including `degrade` (seeded randomness) and poly stacks.
- With the instrumentation card's flag on, play the coastline example: cycle-
  boundary overruns should disappear (or drop to the fallback-only first
  boundary).

## Gotchas

- The seq module's `state()` must stay plain serializable data (module
  contract test enforces this). The prefetch cache arrays are typed-array
  VIEWS — fine. No promises, no closures in state.
- Lane packing must happen worker-side too (`packLanes` order matters for
  which lane gets which event — same function, same order).
- `patsig` has the same query-at-boundary shape; cover it with the same
  mechanism (it's single-lane, simpler).
- Clock bpm can be modulated, so the worker cannot predict wall-time of
  cycles — it doesn't need to; it only answers "give me cycle N," and the
  worklet decides when N is entered.

## Done when

Coastline plays with zero cycle-boundary overruns (measured), all tests green,
and the fallback path is exercised by a test (cache-miss behaves like today).
