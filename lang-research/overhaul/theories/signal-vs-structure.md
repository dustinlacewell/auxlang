# Theory: Signal Model vs Structure Model

## Two Paradigms for Polyphony

### Signal Model (SIMD-like)
Signals have **width**. A 3-voice signal is one entity with 3 lanes.

```
[220, 330, 440] ──→ lpf ──→ [filtered₀, filtered₁, filtered₂]
```

- One lpf node processes 3 lanes
- Voice count is signal metadata
- No node duplication

### Structure Model (Current)
Poly means **multiple nodes**. A 3-voice synth is 3 separate chains.

```
220 ──→ lpf₀ ──→ out
330 ──→ lpf₁ ──→ out
440 ──→ lpf₂ ──→ out
```

- Three lpf nodes exist
- Voice count = node count
- Expansion creates structure

## Current System: Structure with Signal Leaks

NodeInput can be:
- `number` - mono signal
- `OutputRef` - reference to node output
- `number[]` - **poly signal (3 lanes)**
- `OutputRef[]` - **poly references**

Arrays are signal-model thinking in a structure-model system.

During expansion, arrays become structure:
- `[220, 330]` → `saw.0(220)`, `saw.1(330)`

## Why This Matters

### Signal Model Implications
- process() would receive arrays, loop over lanes
- Voice count is runtime, not graph structure
- No node duplication needed
- Stereo is just width=2

### Structure Model Implications
- process() always receives scalars
- Voice count = node count at graph level
- Expansion creates real nodes
- Stereo is 2 separate output nodes

## Which Is Better?

### Signal Model Pros
- Simpler graph (fewer nodes)
- SIMD-friendly runtime
- No expansion pass needed
- Voice count can vary dynamically

### Signal Model Cons
- Every device must handle arrays
- Can't route individual voices differently
- Harder to visualize/debug

### Structure Model Pros
- Each voice is independent
- Can route voices differently
- Visualizer shows actual structure
- process() stays simple

### Structure Model Cons
- Explosion of nodes (N voices × M devices)
- Need expansion pass
- Voice access requires expansion to happen first

## The Hybrid Problem

Current system is hybrid:
- API allows arrays (signal thinking)
- Runtime is scalar (structure result)
- Expansion bridges them

But the bridge is leaky:
- expand() must know about both models
- `polyphonic` flag controls expansion behavior
- Stereo is special-cased

## Thought Experiment: Pure Signal Model

What if we committed fully to signals?

```typescript
interface Signal {
  width: number;  // 1 = mono, 2 = stereo, N = poly
  // ... connection info
}

// lpf doesn't duplicate, it processes all lanes
lpf.process(input: Signal) {
  return input.map(lane => filter(lane));
}
```

### Challenge: Different Processing Per Voice

```javascript
// Voice 0 gets lpf, voice 1 gets hpf
let voices = saw([220, 330])
voices[0].lpf(800)  // How? Signal model doesn't have indexing
voices[1].hpf(200)
```

In pure signal model, you'd need:
```javascript
let v0 = voices.pick(0).lpf(800)
let v1 = voices.pick(1).hpf(200)
poly([v0, v1])
```

Verbose, but explicit.

## Thought Experiment: Pure Structure Model

What if we committed fully to structure?

Arrays expand IMMEDIATELY at API time:
```javascript
saw([220, 330])  // Immediately creates saw.0, saw.1
```

Returns `PolyDescriptor` with `.voices` array.

### Challenge: Deferred Input Count

```javascript
let unknown = somePoly()  // Voice count unknown
unknown.spread()  // How does spread know count?
```

In pure structure model, `somePoly()` MUST know its count.

If count is dynamic (from pattern at runtime), structure model breaks.

## Key Insight

The fundamental tension:

> **Signal model** treats width as data.
> **Structure model** treats width as topology.

Current bugs come from mixing: topology (nodes) tries to express data (arrays).

## Questions

1. Can we eliminate arrays from NodeInput entirely?
2. What if voice count was always static (known at API time)?
3. Is there a third model that avoids these issues?
