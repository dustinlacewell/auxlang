---
id: "instrument-worklet-render-quanta-2026-07-19"
status: "done"
priority: "high"
assignee: null
dueDate: null
created: "2026-07-19T12:00:00.000Z"
modified: "2026-07-19T12:12:18.000Z"
completedAt: "2026-07-19T12:12:18.000Z"
labels: ["performance", "diagnostics"]
order: "a0"
---

# Instrument worklet render quanta (find the crackle)

## ✅ DONE (2026-07-19)

Meter built (`QuantumMeter`), wired into the worklet, driven by a browser
harness page (`perf.html` + `src/ui/core3-perf/main.ts`) and captured headlessly
via a dedicated Chrome + CDP driver (`src/tests/scratch/perf-cdp.mjs`,
`coi-server.mjs`). Real numbers in `llm/handoffs/performance-findings.md`:
coastline overran ~6.9 % of quanta pre-fix, spiking at beat boundaries — the
crackle, caught. That pointed at a2 (reverb), which fixed it.

**Production disposition:** shipped **dev-gated**. Hot-path hooks and the
`enablePerf` path are behind `import.meta.env.DEV`, so a production build folds
them out (verified: `setPerf` called 0×, no `mark()` in the prod worklet hot
path, ~219 B of unreachable dead method text remains — esbuild won't DCE unused
class methods, harmless). `perf.html` is a serve-only vite input, absent from
`vite build`. Timing clock reported per-window (`performance.now` unavailable in
headless AudioWorkletGlobalScope → `Date.now` fallback; real Chrome gets sub-ms).

## Status — instrument built, capture run pending

The meter is implemented and the full suite is green (886 tests); what remains
is the live browser capture, which only the user can do (audio can't run
headless).

**Built:**
- `src/core3/runtime/worklet/quantum-meter.ts` — `QuantumMeter`: preallocated
  ring buffers (2048 quantum times + 64 overruns), `mark(frame)`/`measure(warm)`,
  p99 via bounded copy-sort, ~1 s reporting windows by quantum count, warm-up
  quantum dropped. Zero allocation on the audio thread.
- `src/core3/runtime/worklet/processor.ts` — meter is `null` until enabled, so
  the hot path pays one null-check when off; `mark(currentFrame)` before the
  sample loop, `measure()` after, posts a `PerfReport` per window.
- `src/core3/runtime/worklet/messages.ts` — new `{type:"perf",enabled}` message
  and `PerfReport`/`PerfOverrun` reply types.
- `src/core3/runtime/audio.ts` — `enablePerf(bpm?)`/`disablePerf()`;
  `console.table` summary + per-overrun beat-position table. bpm sniffed from the
  program's clock node when constant, else pass explicitly.
- `llm/handoffs/performance-findings.md` — findings template with the exact
  capture recipe; awaiting the user's numbers.

**Deviation from spec:** the card suggested a `?perf` query param, but a worklet
has no URL access. Used a message-driven flag (`{type:"perf",enabled}`) instead —
same off-by-default, zero-overhead-when-off property.

**Remaining (user):** run the capture per the findings doc's recipe on ≥2 heavy
patches, fill in the tables, write the verdict. That verdict decides whether a1
(queries off the audio thread) is the priority.

## Problem

Nontrivial patches crackle intermittently. Crackling in browser audio means the
AudioWorklet missed its render deadline (~2.67 ms per 128-sample quantum at
48 kHz). We have a strong hypothesis (see the "move pattern queries off the
audio thread" card): `seq`/`patsig` re-query their pattern **on the audio
thread at every cycle boundary**, and `query()` allocates thousands of
short-lived objects (every rational op in `src/core3/pattern/rational.ts`
allocates a fresh `{n,d}`; every event in `src/core3/pattern/query.ts` is a
fresh object). GC pauses from that spike would produce crackles **aligned to
beat/bar boundaries**. This card converts that hypothesis into measured fact
before anyone builds the fix.

## What to build

1. **Locate the worklet processor.** Grep for `registerProcessor` /
   `AudioWorkletProcessor` under `src/`. The engine itself is
   `src/core3/runtime/engine.ts` (`Core3Engine.tick(frame)`); the processor is
   the host that calls it per sample inside `process()`.
2. **Per-quantum timing.** In the processor's `process()`, wrap the sample loop
   with `performance.now()` before/after (verify `performance.now` exists in
   `AudioWorkletGlobalScope` — it does in Chromium; if absent, fall back to
   accumulating `currentFrame` gaps, which reveal dropouts as frame jumps).
   Record elapsed ms into a preallocated Float32Array ring buffer (e.g. 2048
   entries) — do NOT allocate or post messages inside the hot path.
3. **Overrun log.** When elapsed exceeds a budget (start with 2.0 ms), record
   `{elapsed, currentFrame}` into a second small preallocated ring.
4. **Reporting.** Every ~1 s (count quanta, don't use timers), post a summary
   over the processor's port: max/mean/p99 elapsed, overrun count, and the
   `currentFrame` of each overrun. On the main thread, log a compact
   `console.table`.
5. **Correlate with cycle boundaries.** The clock phase advances at
   `bpm/60/sampleRate` per sample (see `src/core3/modules/clock.ts`). From an
   overrun's `currentFrame` and the patch bpm, compute beat position. If
   overruns cluster within a few ms after integer beat positions, the
   query-at-cycle-boundary hypothesis is CONFIRMED — say so explicitly in the
   findings.
6. **Gate it.** Behind a flag (e.g. a `?perf` query param or a const in the
   worklet host), default off. Zero overhead when off (guard before any
   `performance.now` call).

## Verification

- Load the `coastline (after eddyflux)` editor example (the heaviest patch),
  enable the flag, play 60+ seconds, capture the summary output.
- Write findings into `llm/handoffs/performance-findings.md`: p99 quantum time,
  overrun rate, and whether overruns align with beat boundaries. That doc is
  the input for prioritizing the other performance cards.

## Gotchas

- Do not allocate in `process()` — the instrument must not cause the disease it
  measures. Preallocate everything in the processor constructor.
- `console.log` from a worklet doesn't exist reliably; always report via the
  MessagePort.
- One overrun at patch start (first quantum compiles/warms everything) is
  expected; ignore quantum 0 in stats.

## Done when

Findings doc exists with real numbers from at least two example patches, and
states clearly whether overruns correlate with cycle boundaries.
