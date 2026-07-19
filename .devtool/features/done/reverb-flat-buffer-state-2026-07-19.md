---
id: "reverb-flat-buffer-state-2026-07-19"
status: "done"
priority: "high"
assignee: null
dueDate: null
created: "2026-07-19T12:02:00.000Z"
modified: "2026-07-19T12:12:18.000Z"
completedAt: "2026-07-19T12:12:18.000Z"
labels: ["performance", "dsp"]
order: "a2"
---

# Reverb: kill per-sample string keys (flatten to one buffer + offset table)

## ✅ DONE (2026-07-19) — and it was the crackle's main cause

Implemented exactly as designed: `packBank()` helper builds one contiguous
`Float32Array` per bank + `Int32Array` offset/length tables; `tick` hoists the
typed arrays once and indexes numerically (`combBuf[base + idx]`, branch-wrap
instead of `%`). **Bit-identical render proven** (maxDiff=0 over a 2 s reverb
patch), 886 tests green, module-contract test passes, `grep 's\[\`'` in
`src/core3/modules/` returns nothing.

**Impact was far bigger than expected.** Re-measuring coastline before/after
(render-quantum meter, headless, 30 s): quantum-overrun rate dropped from **6.9 %
→ 0.58–2.3 %**, and the **beat-boundary overrun spike vanished** (frac-0 spike
153 → ~5, histogram now flat). This was the dominant crackle cause — not the seq
queries. See `llm/handoffs/performance-findings.md`. Consequence: the a1 card
(off-thread queries) is likely obviated; confirm on real Chrome before building it.

## Problem

`src/core3/modules/reverb.ts` accesses its delay lines with
`s[`comb${c}`]` and `s[`ap${a}`]` inside `tick` — that is **12 template-string
constructions and 12 dynamic string-keyed lookups per sample** (8 combs + 4
allpasses). At 48 kHz that's ~576k string builds per second **per reverb
instance**, all garbage. The coastline example runs three reverbs. This is
steady GC pressure and defeats JIT optimization of the hot loop.

(History: the state was originally `Float32Array[]` — an array of typed
arrays — which failed the module contract test ("state() returns plain
serializable data": every field must be a number, string, or typed-array VIEW,
not a plain array/object). The string-keyed flat fields were the workaround.
This card does the workaround properly.)

## Fix

Restructure state to **one contiguous Float32Array per filter bank** plus
integer offset/length tables. No engine changes, no contract changes.

```ts
state: (sr) => {
  const scale = sr / BASE_SR;
  const combLens = COMB_TUNING.map((n) => Math.max(1, Math.round(n * scale)));
  const apLens = ALLPASS_TUNING.map((n) => Math.max(1, Math.round(n * scale)));
  const combOff = new Int32Array(combLens.length);
  let acc = 0;
  combLens.forEach((len, i) => { combOff[i] = acc; acc += len; });
  // ... same for apOff/apTotal
  return {
    combBuf: new Float32Array(combTotal),
    combOff, combLen: Int32Array.from(combLens),
    combIdx: new Int32Array(combLens.length),
    combStore: new Float32Array(combLens.length),
    apBuf: new Float32Array(apTotal),
    apOff, apLen: Int32Array.from(apLens),
    apIdx: new Int32Array(apLens.length),
  };
}
```

In `tick`, hoist each typed array into a local ONCE at the top
(`const combBuf = s.combBuf as Float32Array;` etc.), then index numerically:
`combBuf[(combOff[c] + idx)]`, wrap with `idx + 1 === combLen[c] ? 0 : idx + 1`
(avoid `%` — a branch is cheaper and clearer). Zero strings, zero allocation,
monomorphic loads.

## Verification (all three required)

1. **Contract suite**: `npx vitest run src/tests/core3` — the module contract
   test must pass (all state fields are numbers or `ArrayBuffer.isView`).
2. **Bit-identical output**: before touching anything, render a reference —
   e.g. via the eval path used in `src/tests/core3/bridge/site-examples.test.ts`
   (`evalPatch` from `src/ui/core3-playground/eval-patch.ts` + `render` from
   `src/core3/runtime/render.ts`) — of
   `sin({pitch:60}).mul(0.3).reverb({room:0.6,damp:0.5,mix:0.5}).out()` for 2 s
   into a Float32Array. After the refactor, render again and assert
   **every sample identical** (the arithmetic order must not change — keep the
   comb loop, damp/feedback math, and allpass loop line-for-line, only the
   indexing changes). Write this as a scratch script in `src/tests/scratch/`
   (run with `npx tsx`), then delete it after confirming; keep the existing
   reverb doc-example tests as the durable regression.
3. **The 6 reverb doc examples** in `src/ui/module-docs/examples.ts` still pass
   (they're covered by `module-docs-examples.test.ts`).

## Gotchas

- `state()` receives `sr` — lengths are sample-rate-scaled; offsets must be
  computed from the SCALED lengths, not the base tuning.
- Keep `COMB_TUNING`/`ALLPASS_TUNING`/`BASE_SR` and the `feedback = room*0.28
  + 0.7`, `wet *= 0.125` constants untouched — they are the Freeverb tuning.
- While in the file: check `src/core3/modules/phaser.ts` and
  `src/core3/modules/delay.ts` for the same anti-pattern — they are already
  clean (fixed-name fields, hoisted locals); use them as the style reference.

## Done when

Bit-identical render proven, full suite green, no string-keyed state access
remains in any module (`grep -n "s\[\`" src/core3/modules/` returns nothing).
