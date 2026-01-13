# Uzu: Auxlang Refactored

A design document for cleaning up and unifying Auxlang's architecture.

---

## 1. Architecture Comparison: KabelSalat vs Auxlang

### KabelSalat's Approach
KabelSalat compiles graphs to JavaScript code strings:

```
Node graph → topoSort → codegen → { src: "r[1] = nodes[0].update(r[0])", ugens: [...] }
                                        ↓
                              new Function(src) in worklet
```

The generated code is flat register assignments:
```javascript
r[0] = 220;                           // constant
r[1] = nodes[0].update(r[0], 0, 0);   // SineOsc
r[2] = r[1] * 0.5;                    // multiply
o[0] = r[2];                          // output
```

### Auxlang's Approach
Auxlang traverses the graph at runtime:

```
Descriptor → reify() → Graph → compile() → CompiledGraph → worklet
                                                              ↓
                                          RuntimeGraph.processSample() loops nodes
```

Each sample: iterate nodes in topo order, resolve inputs, call `node.process()`.

### Why Codegen Isn't Necessarily Better

1. **V8 JIT is excellent** - KabelSalat's blog (post 034) notes JS outperformed their WASM implementation
2. **WASM dominates CPU anyway** - Filters, delays, reverbs are WASM. Graph dispatch is noise.
3. **Debugging** - Auxlang's approach lets you inspect node state, log per-node. Codegen is opaque.
4. **Maintainability** - Devices are just functions. No code generation templates.

### What Auxlang Does Better

1. **Voice ID tracking** - Sequencer voices have identity that persists through glides
2. **Topology hashing** - State preserved across graph changes (clock keeps ticking when BPM changes)
3. **WASM integration** - First-class support with `wasmBytes` in compiled nodes
4. **Dynamic polyphony** - Voices appear/disappear at runtime

---

## 2. The Polyphony Question

### Why Voice IDs Exist

```javascript
seq("{c4, e4, g4} ~")  // 3 notes, then rest
```

At any moment, different voices are active. An ADSR receiving this needs envelope state *per voice*. If voice 0 releases while voice 1 attacks, those are separate state machines.

Without voice IDs: if sequencer outputs `[440, 550]` tick 1 and `[550, 660]` tick 2 (voice 0 ended), the ADSR can't distinguish - it applies voice 0's release to the new voice.

### KabelSalat's Alternative: Compile-Time Duplication

```javascript
sine([220, 330, 440])  // becomes 3 separate sine nodes in graph
```

The `poly` node triggers graph cloning. Each voice is a separate subgraph with its own state. No runtime voice tracking needed.

**Tradeoff:**

| | KabelSalat | Auxlang |
|---|---|---|
| Voice count | Fixed at compile time | Dynamic at runtime |
| Graph size | Grows with voices | Constant |
| Device complexity | Simple (mono) | Must handle voices |
| Dynamic notes | Not possible | Supported |

### Conclusion

Voice IDs are necessary for our sequencer's dynamic polyphony. But device authoring can be simplified.

---

## 3. Device Authoring Simplification

### Current Pain

Every device has this boilerplate:
```typescript
process(inp, cfg, state, sr) {
  const freqSig = (inp.freq ?? []) as PS;
  if (freqSig.length === 0) return { out: [] };

  if (!state.phases) state.phases = new Map<number, number>();
  const phases = state.phases as Map<number, number>;

  const out: PS = [];
  for (const freqCh of freqSig) {
    const id = freqCh.id;
    const freq = freqCh.value;
    // actual logic here
    out.push({ id, value: result });
  }
  return { out };
}
```

### Proposal: `lib.perVoice` Helper

```typescript
process(inp, state, sr, lib) {
  return lib.perVoice(inp, state, (mono, voiceState) => {
    // voiceState auto-keyed by voice ID
    voiceState.phase ??= 0;
    voiceState.phase = (voiceState.phase + mono.freq / sr) % 1;
    return Math.sin(voiceState.phase * TAU);
  });
}
```

The helper:
- Iterates voice IDs across all inputs
- Extracts mono values per voice
- Manages state keying
- Builds output PolySignal

Device author writes mono logic. Never sees `{id, value}`.

### When You Need All Voices

Only two cases:
- **mix** - Sum voices to stereo
- **output** - Final sum

Everything else is per-voice: oscillators, filters, envelopes, math, effects.

### Pass Lib as Argument

Instead of:
```typescript
(globalThis as any).poly = { getValue, getVoiceIds, sum }
```

Pass utilities to process:
```typescript
process(inp, state, sr, lib) {
  lib.perVoice(...)
  lib.sum(...)
}
```

Cleaner, no global mutation.

---

## 4. Unified Input Model (Killing Config)

### Current Split

```typescript
device({
  inputs: inputs({ freq: 440, cutoff: 800 }),  // signals
  config: { shape: waveshaperFn, expr: seqAst },  // "other stuff"
})
```

### The Problem

Config "functions" are a serialization hack:
```typescript
// seq.ts
const exprFn = new Function(`return ${JSON.stringify(expr)}`) as () => Expr;
config: { expr: exprFn }
```

This wraps data in a function just to survive serialization. Conflates two things:
- User-defined functions (waveshapers)
- Static data (AST)

### Proposal: Everything Is a Signal

Merge inputs and config. The second arg to a device is "all other params":

```javascript
osc(440, { detune: lfo(1), min: -0.5 })
seq("c4 e4", { swing: 0.1 })
```

Each value is either:
- Number/array → constant signal
- Descriptor → connection

### No Function Inputs

We decided NOT to support user-provided functions as signal values.

Why? Type ambiguity:
```javascript
osc(440, { shape: lfo(1) })  // oops, signal not function
```

If users need custom DSP, they write a device. KabelSalat does the same - no waveshaper input, just `register()` a custom oscillator.

This simplifies everything:
- No `typeof` checks at runtime
- No function stringification for user values
- Cleaner serialization

---

## 5. Uzu Chaining Syntax

### Goal

```javascript
osc(440).lpf({ cutoff: 800 }).adsr({ attack: 0.1 })
```

### Desugaring

```javascript
adsr(lpf(osc(440), { cutoff: 800 }), { attack: 0.1 })
```

Rules:
- First positional arg = main input (from previous device's default output)
- Object arg = all other named params

### Device Registration

For chaining to work, the proxy needs to look up methods:

```javascript
osc(440).lpf(...)
//       ^^^ proxy needs to find lpf
```

Registered devices are chainable. If you write a custom device without registering:

```javascript
const myThing = device({ ... })
myThing(osc(440), { param: 5 })  // function call, not chained
```

Or register it:
```javascript
register('myThing', device({ ... }))
osc(440).myThing({ param: 5 })  // now chainable
```

---

## 6. Two Kinds of "Devices"

### Primitive Devices

Have `process` functions, run in worklet:

```typescript
const osc = device({
  inputs: inputs({ freq: 440 }),
  process(inp, state, sr, lib) {
    return lib.perVoice(inp, state, (mono, vs) => {
      vs.phase = (vs.phase ?? 0 + mono.freq / sr) % 1;
      return Math.sin(vs.phase * TAU);
    });
  }
});
```

### Composite Devices

Functions returning descriptor graphs - pure composition:

```javascript
register('pluck', (freq) => {
  let env = adsr(impulse(freq), { attack: 0.001, decay: 0.2 })
  return mult(saw(freq), env)
})

// Usage
seq("c4 e4 g4").pluck().lpf({ cutoff: 2000 }).out()
```

No process function. No serialization. Just wires up primitives.

This is like KabelSalat's `module()` / `register()`. Composites are macros that expand at graph construction time.

---

## 7. Stereo Model

### Everything Is Mono Until Mix

Eurorack approach:
- VCO outputs mono
- VCF outputs mono
- VCA outputs mono
- Stereo happens at the mixer

### Mix Device

```javascript
mix(voices, { spread: 0.8 })  // voices → stereo pair
```

The spread parameter pans voices across the stereo field. 0 = mono center, 1 = full spread.

Output is a 2-element signal meaning [L, R]. Not a special "stereo type" - just a convention.

### No Per-Voice Panning

Voices don't have individual pan positions in the signal chain. The mix device assigns positions based on voice index and spread amount. If you need custom per-voice routing, split first.

---

## 8. Concrete Cleanup Tasks

### High Impact

**Biquad filter factory** (`src/devices/lpf.ts`, `hpf.ts`, `bpf.ts`, `notch.ts`)
- 4 files, ~75 lines each, 95% identical
- Extract `createBiquadFilter(coefficientFn)`
- ~200 lines → ~50 lines

**Math device factory** (`src/devices/math.ts`)
- 11 devices with identical boilerplate
- Extract `createBinaryOp(name, op, defaultB)`
- ~250 lines → ~50 lines

### Medium Impact

**Kill LegacyPolySignal** (`src/runtime/processor/`)
- Remove `LegacyPolySignal`, `fromLegacy`, `toLegacy`
- Use `{id, value}[]` everywhere
- Eliminates conversion layers

**Export PS type once** (21 device files)
- Currently redefined in every device: `type PS = Array<{ id: number; value: number }>`
- Export from `src/runtime/processor/poly-signal.ts`
- Import everywhere

**Consolidate poly utilities**
- `src/runtime/processor/poly-signal.ts`
- `src/runtime/worklet/poly.ts`
- Overlapping functions, should be one module

### Low Impact / Quick Wins

**Remove hot loop guards** (`src/runtime/processor/runtime-graph.ts:296-317`)
```typescript
// These checks are impossible - arrays are pre-allocated
if (!node) continue;
if (!binding || !inputName) continue;
```

**Remove unused import** (`src/graph/reify.ts`)
- `GraphNode` imported but never used

**Name magic numbers** (`src/devices/lpf.ts:42` etc.)
- `Math.sin(w) / (2 + resonance * 10)` - what's the 10?

---

## 9. Serialization Strategy

### Device Process Functions

These still need stringification to cross to worklet:

```typescript
// compile.ts
processSource: spec.process.toString()

// hydrate.ts
new Function(`return (${processSource})`)()
```

This is internal machinery. Users don't provide functions.

### Signal Values

Simple JSON for everything in params:
- Numbers → as-is
- Arrays → as-is
- Descriptors → resolve to `{ type: "connection", nodeId, output }`

No function serialization for user values since we don't support function inputs.

### Static Data in Devices

For things like seq's AST, serialize as JSON in the spec:

```typescript
// Instead of
config: { expr: new Function(`return ${JSON.stringify(expr)}`) }

// Just
data: { expr: expr }  // serialized as JSON, parsed in worklet
```

Separate `data` from `inputs`. Or: include in inputs but mark as non-signal.

---

## 10. Open Questions

1. **Worklet code sharing** - Is the inability to import in worklets a bundler config issue or fundamental Web Audio limitation? Could Vite be configured to share code?

2. **Hot loop performance** - Can we measure actual overhead of graph traversal vs DSP? Might not matter if WASM dominates.

3. **Device registration API** - Exact syntax for registering primitives vs composites? Namespace collisions?

4. **Seq data serialization** - Best way to pass AST without the function hack? Separate `data` field? Or special-case in serializer?

5. **perVoice return type** - Single output or multiple? `{ out: PS }` vs `PS` vs `Record<string, PS>`?

---

## Summary

Uzu is Auxlang with:
- Unified input model (no config/input split)
- Method chaining via device registration
- Composite devices (graph macros)
- Simplified device authoring (`lib.perVoice`)
- Cleaned up redundancy (factories for filters/math)
- One signal format everywhere (no legacy conversion)
- Mono-until-mix stereo model
