# Core Cleanup Plan

Tightening up Auxlang's implementation - removing LLM bloat, redundancy, and unnecessary ceremony.

## Architecture Questions

### 1. PolySignal Format

**Current:** Signals are `{id, value}[]` everywhere, with "legacy" `number[]` conversion layers.

**Problem:**
- `LegacyPolySignal`, `fromLegacy`, `toLegacy` exist as translation layers
- Every device casts inputs: `(inp.freq ?? []) as PS`
- `normalizeOutput()` runs type checks in hot path every sample

**Options:**
- A) Use `{id, value}[]` everywhere, kill legacy code
- B) Use `number[]` with separate `voiceIds` array (like KabelSalat)
- C) Hybrid: `number[]` for mono, `{id, value}[]` only when polyphonic

**Consideration:** Option B would mean voice IDs travel separately from values. Sequencer outputs `voiceIds` once, devices just process parallel arrays. Simpler for most devices, but how does voice identity survive through the graph?

### 2. Config Serialization

**Current:** Config values are wrapped in functions for serialization:
```typescript
const exprFn = new Function(`return ${JSON.stringify(expr)}`) as () => Expr;
```

**Problem:** Conflates two use cases:
- User-defined functions (waveshapers) that actually need to be functions
- Static data (AST, counts) that's just piggybacking on the mechanism

**Solution:** Write a serializer that detects type:
- `typeof val === 'function'` → stringify with `.toString()`
- Otherwise → `JSON.stringify()`

Hydration reverses: function strings get `new Function()`, data gets `JSON.parse()`.

### 3. Worklet Code Sharing

**Current:** Worklet can't import from main app. We use `globalThis` injection:
```typescript
(globalThis as any).poly = { getValue, getVoiceIds, sum }
(globalThis as any).seqTraverse = { ... }
```

**Question:** Is this a fundamental Web Audio limitation or bundler config?

**Investigation needed:**
- Can Vite bundle worklet code with shared imports?
- Does `new URL('./worklet.ts', import.meta.url)` support imports?
- What do other projects do? (Strudel, KabelSalat, Tone.js)

**If solvable:** Devices could import utilities normally, no globalThis hacks.

### 4. Device Return Type Ergonomics

**Current:** Devices must return `{ out: PolySignal }` with full `{id, value}` objects.

**Problem:** Verbose for simple devices. User writing a custom device has to:
```typescript
const out: PS = [];
for (const id of voiceIds) {
  out.push({ id, value: something });
}
return { out };
```

**Options:**
- A) Helper: `return { out: poly.map(ids, values) }`
- B) Accept multiple return formats, normalize in runtime (current approach, but slower)
- C) Code generation / macro for simple cases

### 5. Passing Lib to Devices

**Current:** `globalThis.poly` accessed magically in device process functions.

**Better:** Pass as argument:
```typescript
process(inp, cfg, state, sampleRate, lib) {
  const ids = lib.poly.getVoiceIds(inp.freq);
}
```

**Requires:** Changing device signature, updating all devices, updating hydration.

---

## Concrete Redundancy Fixes

### 6. Biquad Filter Duplication

**Files:** `src/devices/lpf.ts`, `hpf.ts`, `bpf.ts`, `notch.ts` (~75 lines each)

**Problem:** 95% identical code. Only coefficient formulas differ.

**Solution:** Extract `createBiquadFilter(coefficientFn)` factory:
```typescript
export const lpf = createBiquadFilter((w, Q) => {
  const cos_w = Math.cos(w);
  const alpha = Math.sin(w) / (2 * Q);
  return {
    b0: (1 - cos_w) / 2,
    b1: 1 - cos_w,
    b2: (1 - cos_w) / 2,
    a0: 1 + alpha,
    a1: -2 * cos_w,
    a2: 1 - alpha,
  };
});
```

**Impact:** ~200 lines → ~50 lines

### 7. Math Device Duplication

**File:** `src/devices/math.ts` (285 lines)

**Problem:** 11 nearly identical devices with only the operation differing.

**Solution:** Factory function:
```typescript
const createBinaryOp = (name: string, op: (a: number, b: number) => number, defaultB = 0) =>
  device({
    inputs: inputs({ input: 0, by: defaultB }),
    process(inp, _cfg, _state, _sr) {
      // shared boilerplate
      return { out: poly.mapBinary(inp.input, inp.by, op) };
    },
  });

export const mult = createBinaryOp("mult", (a, b) => a * b, 1);
export const add = createBinaryOp("add", (a, b) => a + b, 0);
export const sub = createBinaryOp("sub", (a, b) => a - b, 0);
```

**Impact:** ~250 lines → ~50 lines

### 8. PS Type Redefinition

**Problem:** Every device file has:
```typescript
type PS = Array<{ id: number; value: number }>;
```

**Solution:** Export from one place, import everywhere:
```typescript
// src/runtime/processor/poly-signal.ts
export type PS = PolySignal;  // or just use PolySignal directly

// src/devices/osc.ts
import type { PS } from "../runtime/processor/poly-signal";
```

### 9. Hot Loop Defensive Checks

**File:** `src/runtime/processor/runtime-graph.ts` (lines 296-317)

**Problem:** Checks like `if (!node) continue` on pre-allocated arrays that can never be null.

**Solution:** Remove guards. Arrays are built by `map()` - they're dense by construction.

```typescript
// Before
for (let i = 0; i < this.nodes.length; i++) {
  const node = this.nodes[i];
  if (!node) continue;  // impossible

// After
for (let i = 0; i < this.nodes.length; i++) {
  const node = this.nodes[i]!;  // assert non-null via !
```

### 10. Hydration Consolidation

**Files:** `src/runtime/processor/hydrate.ts` + inline in `runtime-graph.ts`

**Problem:** Two hydration paths, unclear which is used.

**Investigation needed:** Trace actual call path, remove dead code.

### 11. graphsEquivalent Inefficiency

**File:** `src/graph/diff/diff.ts`

**Problem:** `graphsEquivalent()` computes full diff then checks if empty.

**Solution:** Early exit version:
```typescript
export function graphsEquivalent(old: Graph, new_: Graph): boolean {
  if (old.nodes.length !== new_.nodes.length) return false;
  // Quick check without full diff computation
  for (let i = 0; i < old.nodes.length; i++) {
    if (computeNodeHash(old.nodes[i]) !== computeNodeHash(new_.nodes[i])) {
      return false;
    }
  }
  return true;
}
```

### 12. Minor Cleanup

- Remove unused `GraphNode` import in `reify.ts`
- Name magic numbers in filter resonance scaling
- Consolidate `poly-signal.ts` and `worklet/poly.ts`

---

## Priority Order

1. **PS type export** - Quick win, touches many files but simple
2. **Biquad factory** - Big line reduction, isolated change
3. **Math factory** - Big line reduction, isolated change
4. **Hot loop guards** - Performance, small change
5. **Config serialization** - Cleaner architecture
6. **Worklet sharing investigation** - Might unlock bigger simplifications
7. **PolySignal format decision** - Biggest architectural question, needs more thought

---

## Open Questions

- Is voice ID tracking actually necessary for our use cases? What breaks if we use array indices?
- Can we measure the hot loop overhead? Is it actually significant vs DSP cost?
- What's the simplest possible device authoring API that still supports polyphony?
