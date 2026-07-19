# Performance findings — crackle investigation

## HEADLINE (2026-07-19): a2 (reverb flatten) fixed the crackle. a1 is likely unnecessary.

Measured with the render-quantum meter (a0) via a headless Chrome + CDP harness,
coastline patch, 30 s runs. **The reverb string-key allocation was the dominant
cause of the crackle — not the seq queries.**

| metric | PRE-a2 | POST-a2 run 1 | POST-a2 run 2 |
|---|---|---|---|
| overrun rate (>2 ms quanta) | **6.9 %** | **0.58 %** | **2.33 %** |
| mean quantum | ~1.5 ms | ~1.08 ms | ~1.29 ms |
| worst quantum | 5 ms | 4 ms | 5 ms |
| beat-boundary clustering | **spike at frac 0 (153)** | flat (5) | 24 % (below 30 % chance) |

**Interpretation:**
- a2 cut the overrun rate ~3–12× and **eliminated the beat-boundary spike** that
  was the fingerprint of the a1 hypothesis (query-at-cycle-boundary GC).
- Remaining overruns are flat across the bar (no clustering) — they are NOT the
  seq-query signature. They're background jitter / steady per-sample cost.
- Caveat: numbers are `Date.now` (1 ms granularity) because headless Chrome
  doesn't expose `performance.now` in the AudioWorkletGlobalScope. Read the
  *shape and ratios*, not absolute ms. On real Chrome the resolution is sub-ms.

**Recommendation for the next session:**
- **a1 (move queries off the audio thread) is probably NOT worth its complexity
  now.** The crackle it targeted is largely gone. Do NOT build the worker
  architecture without first re-measuring on **real (non-headless) Chrome** and
  confirming a residual beat-aligned spike actually exists. If the histogram is
  flat on real Chrome too, close a1 as "obviated by a2."
- If residual overruns still bother the ear, the next lever is **a3 (codegen
  driver)** — it attacks the flat, steady per-sample interpreter cost (the mean
  quantum time), which is what's left. That matches the now-flat profile better
  than a1 does.
- The a1 design pass was completed and is preserved below / in the a1 kanban
  card, so if real-Chrome measurement resurrects the need, the design is ready.

Captures saved in `llm/handoffs/perf-captures/`:
- `coastline-post-a2-30s.json` (run 1), `coastline-post-a2-30s-run2.json` (run 2).

## What shipped this session

- **a2 DONE**: `src/core3/modules/reverb.ts` — replaced `s[\`comb${c}\`]`
  per-sample string-key state with one contiguous `Float32Array` per bank +
  `Int32Array` offset/length tables (`packBank` helper). **Bit-identical render
  proven** (maxDiff=0), 886 tests green, module contract satisfied, no string-key
  access remains in any module. Killed ~1.7M string allocs/sec (×3 reverbs in
  coastline).
- **a0 meter**: still in the codebase, opt-in (`enablePerf`/`disablePerf`),
  reports `clock` (`performance.now`|`Date.now`|`none`). Open question the user
  raised: should this ship in production, or be dev-only gated / deleted?
  (Not yet decided.)

## The harness (how to reproduce / measure on real Chrome)

Page: **`perf.html`** + `src/ui/core3-perf/main.ts` — pick an example, Start/Stop,
live table; every ~1 s window → `window.__perf` + `[PERF] {json}` console line.

- **On real Chrome (best resolution):** `npm run dev` won't work (worklet loads
  from a built bundle path). Instead: `npx vite build`, then serve `dist/` (any
  static server; `src/tests/scratch/coi-server.mjs <port>` adds COOP/COEP so the
  page is cross-origin-isolated). Open `perf.html`, pick coastline, Start, watch
  the console `[PERF]` lines. On real Chrome `clock` should read `performance.now`
  → sub-ms → decisive beat-frac histogram.
- **Headless via CDP** (what produced the numbers above): launch a DEDICATED
  Chrome (own `--user-data-dir`, own `--remote-debugging-port`, never the user's
  main profile), then `node src/tests/scratch/perf-cdp.mjs <wsUrl> <seconds>`.
  The driver's stdout redirect is flaky; pull data reliably with a CDP
  `Runtime.evaluate` of `JSON.stringify(window.__perf)` (see the dump pattern in
  scratch). Verify the profile name before killing the Chrome PID.

Scratch tools kept for reproduction: `src/tests/scratch/perf-cdp.mjs`,
`src/tests/scratch/coi-server.mjs`.
