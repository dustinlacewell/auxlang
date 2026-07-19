---
id: "codegen-unrolled-program-driver-2026-07-19"
status: "backlog"
priority: "medium"
assignee: null
dueDate: null
created: "2026-07-19T12:03:00.000Z"
modified: "2026-07-19T12:03:00.000Z"
completedAt: null
labels: ["performance", "architecture", "codegen"]
order: "a3"
---

# Codegen: unrolled per-program driver (monomorphic tick loop)

## Problem

The engine (`src/core3/runtime/engine.ts`) is a per-sample interpreter: for
every sample it loops over nodes, gathers each node's inputs through
per-binding closures (`src/core3/runtime/bindings.ts`,
`src/core3/runtime/gathers.ts`), calls the module's `tick` closure, and
scatters outputs into slot buffers (`src/core3/runtime/output-slots.ts`).
Every `tick` is a different function called from the SAME loop call site, so
the site is megamorphic — V8 cannot inline anything, and per-node dispatch +
input-object traffic dominates. Interpreted per-sample graphs typically run
10–50× slower than compiled equivalents. This caps polyphony and leaves less
headroom before quanta overrun.

## Design: generate one driver function per compiled Program

At program build time, emit JavaScript source with `new Function` that unrolls
the node loop: one **distinct, static call site per (node, lane)**, with slot
indices baked in as integer literals and state/config/ins/outs objects
pre-bound in the closure scope. Module `tick` functions stay exactly as they
are — no source-string extraction, no `Function.prototype.toString` inlining
(that breaks on closures over module constants like `COMB_TUNING`; do NOT
attempt it in this card). The win comes from:

- each call site is monomorphic → V8 inlines small ticks (`mul`, `add`,
  `clip`, oscillators) into the driver;
- input gathering becomes straight-line code (`ins3.cutoff = buf[17]`) instead
  of closure indirection per port per sample;
- the buffer flip and output scatter are inline literals.

Sketch of generated source for one node:

```js
// node 3: lpf, lane 0 — slots baked from OutputLayout
i3.in = cur[12]; i3.cutoff = cur[17]; i3.res = 0.3;   // gathers: n-src, n-src, const
tick3(st3_0, i3, o3, cfg3, sr);                        // monomorphic site
nxt[20] = o3.out;                                      // scatter
```

The generator walks the same structures the interpreter uses today —
`program.nodes`, each lane's port-source records (see `compileLaneBindings` in
engine.ts and `src/core3/runtime/bindings.ts`), and the `OutputLayout` — so
there is ONE source of truth for semantics. z-sources read the previous buffer
(`prv[k]`), exactly mirroring today's n/z distinction.

## Implementation steps

1. Read `engine.ts`, `bindings.ts`, `gathers.ts`, `output-slots.ts` until you
   can state precisely what happens for one sample of a 3-node program.
   The generated code must replicate it exactly, including evaluation order
   (node index order), lambda inputs (`(s, sr, t) => n` — call them like the
   interpreter does), lane-selected refs, and reduce-policy nodes
   (`mix`/`out`) which read ALL lanes of their source.
2. Build the generator as a new file, e.g.
   `src/core3/runtime/compile-driver.ts`, exporting
   `compileDriver(program, registry, layout): (cur, nxt, prv, sr, t) => void`
   (exact signature to be shaped by what engine.tick needs — keep the engine
   owning buffers and the flip; the driver only computes one sample).
3. Wire it behind a flag on `Core3Engine` (constructor option
   `{codegen: true}`), default OFF initially. The interpreter path stays —
   it is the reference implementation and the fallback (CSP environments can
   forbid `new Function`; catch that and fall back loudly-logged).
4. **Differential test** (the heart of this card): for EVERY site/docs example
   (reuse the example sources exercised by
   `src/tests/core3/bridge/site-examples.test.ts` and the docs-examples
   tests), render 1 s with codegen off and on, assert bit-identical output.
   Determinism is already a hard project invariant (seeded hashing, no
   Math.random), so any divergence is a generator bug — this test finds it.
5. Benchmark: a scratch script rendering the coastline example N times with
   both paths, report samples/sec ratio. Record the number in the card /
   handoff doc. Expect roughly 2–5×; if it's under 1.5×, investigate before
   shipping (likely the ins-object writes — consider per-node persistent ins
   objects, which is what the sketch assumes).
6. Flip the default ON in the worklet host once differential tests pass.

## Constraints

- Hot-swap/live-reeval must keep working: regenerating the driver on each eval
  is fine (`new Function` compile of a few-hundred-line body is ~1 ms) — it
  happens on the main thread before program transfer, or in the worklet on
  program receipt. State migration is untouched (state shape doesn't change).
- Generated source must never embed user strings unescaped — everything baked
  in is numeric (slot indices, constants) or `JSON.stringify`-ed config.
- Do not modify any module in `src/core3/modules/` for this card.

## Done when

Differential test green over all examples, benchmark ratio recorded, codegen
on by default in the worklet with interpreter fallback intact, full suite
green.
