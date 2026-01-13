# Polyphony Unification Proposal

## Executive Summary

This proposal unifies auxlang's polyphony system around three key ideas:

1. **Deferred expansion** - Arrays and poly descriptors stay unexpanded until the expansion pass
2. **VoiceRef** - Symbolic reference `{source, index, output?}` for voice access without eager expansion
3. **Expand context** - Device authors write normal API code in expand(), infrastructure captures all created nodes

The result is a uniform device API where ALL devices work identically: chaining, positional args, method setters.

---

## The Three Phases

### Phase 1: API Time (Dead Graph)

User code executes. Device calls create **descriptors** - lazy specifications that form a DAG through input references.

```javascript
clock(120).apply(c => {
  let s = seq("{c4, e4, g4}").clk(c)
  s.voices[0].saw().gain(s.voices[0].gate.ad()).out()
})
```

**What gets created:**
- `Node` objects with inputs that may contain:
  - `number` - constants
  - `number[]` - poly constants (NOT expanded yet)
  - `OutputRef` - reference to another node's output
  - `OutputRef[]` - poly references (NOT expanded yet)
  - `VoiceRef` - symbolic voice reference (NEW)
  - `VoiceRef[]` - array of symbolic voice references (NEW)

**What does NOT happen:**
- No expansion of arrays
- No duplication of nodes
- No resolution of VoiceRefs

The graph is "dead" - just data describing intent.

### Phase 2: Expansion Time

Nodes are processed in **topological order** (dependencies first). For each node, the expansion algorithm runs:

```
if (has expand) {
  if (polyphonic) {
    // Don't duplicate, call expand() with poly inputs
    expand(config, inputBindings)  // inputBindings may have arrays
  } else {
    // Duplicate first, then call expand() on each duplicate
    for each voice:
      expand(config, monoInputBindings)
  }
} else {
  if (polyphonic) {
    // Don't duplicate, node uses processAll() at runtime
    keep node as-is, runtime receives arrays
  } else {
    // Duplicate, each uses process() at runtime
    for each voice:
      create duplicate with mono inputs
  }
}
```

**Key insight:** `polyphonic` controls duplication. `expand` vs `processAll` controls when poly is handled (graph-time vs runtime).

**The expand() contract:**

```typescript
expand(config: Record<string, ConfigValue>, inputBindings: Record<string, NodeInput>): Node | Node[]
```

- `config` - static configuration from the node
- `inputBindings` - resolved inputs (arrays for poly-consuming devices)
- Returns output node(s) that downstream should reference

**The expand context mechanism:**

When expand() runs, the infrastructure swaps in a scoped context. All node creation during expand() is captured automatically.

```typescript
function runExpand(spec, config, inputBindings): ExpandResult {
  const context = createExpandContext();
  pushContext(context);

  try {
    const outputs = spec.expand(config, inputBindings);
    return {
      allNodes: context.createdNodes,  // Everything created
      outputs: Array.isArray(outputs) ? outputs : [outputs]
    };
  } finally {
    popContext();
  }
}
```

Device authors just use the normal API:

```typescript
expand(config, inputBindings) {
  const input = inputBindings.input;
  const p = inputBindings.pan;

  const mono = isPolyInput(input) ? sum(input) : input;

  return [mono.panLeft(p), mono.panRight(p)];
}
```

- **Head connection**: Device author wires to `inputBindings`
- **Internal nodes**: Captured automatically by context
- **Tail connection**: Infrastructure uses returned outputs for nodeMap

### Phase 3: Compile Time

Convert expanded `Node` objects to `RuntimeNode` objects for AudioWorklet:

- Validate no arrays remain in inputs
- Resolve OutputRefs to concrete sources
- Serialize process functions
- Package for worklet

---

## VoiceRef: Symbolic Voice Access

### The Problem

Users want to access individual voices:
```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Different waveshape per voice
c.voices[1].tri()
```

But with deferred expansion, voices don't exist yet at API time.

### The Solution

`voices[N]` returns a **symbolic reference** that resolves at expansion time:

```typescript
interface VoiceRef {
  type: "voiceRef";
  source: NodeId;
  index: number;
  output?: string;  // defaults to device's defaultOutput
}
```

### How It Works

```javascript
let s = seq("{c4, e4, g4}")
s.voices[0]              // VoiceRef { source: "seq1", index: 0 }
s.voices[0].cv           // VoiceRef { source: "seq1", index: 0, output: "cv" }
s.voices[0].saw()        // Descriptor with input = VoiceRef
```

At expansion time:
1. seq1 expands to ["seq1.0", "seq1.1", "seq1.2"]
2. VoiceRef(seq1, 0, "cv") resolves to OutputRef(seq1.0, "cv")
3. saw gets this OutputRef as its freq input

### Edge Cases

**VoiceRef on mono source:**
- `voices[0]` works (returns the source itself)
- `voices[1+]` errors at expansion time

**VoiceRef out of range:**
- Error at expansion time when index >= actual voice count

**VoiceRef is chainable:**
```javascript
s.voices[0].saw().lpf(800)  // VoiceRef → Descriptor → Descriptor
```

Once you chain from VoiceRef, you get a regular mono descriptor.

### VoiceRef Arrays

VoiceRef[] is a valid input type for selecting specific voices:

```javascript
let s = seq("{c4, e4, g4, b4}")

// Direct to any device that accepts arrays
saw([s.voices[1], s.voices[0]]).spread().out()

// Pick specific voices
poly([s.voices[0], s.voices[1]]).saw().spread().out()

// Reorder voices
poly([s.voices[3], s.voices[2], s.voices[1], s.voices[0]]).tri().spread().out()

// Duplicate voices
poly([s.voices[0], s.voices[0], s.voices[1], s.voices[1]]).sin().spread().out()
```

At expansion time, each VoiceRef in the array resolves independently to its OutputRef. The result is an OutputRef[] that triggers normal poly duplication.

---

## Device Feature Matrix

| polyphonic | expand() | processAll() | Valid? | Behavior | Examples |
|------------|----------|--------------|--------|----------|----------|
| false | no | no | ✓ | Duplicated, process() at runtime | lpf, gain, osc |
| false | yes | no | ✓ | Duplicated, then expand() replaces each | seq, chord |
| false | * | yes | ✗ | Invalid - duplication defeats processAll | - |
| true | no | no | ✗ | Invalid - polyphonic but nothing handles poly | - |
| true | no | yes | ✓ | Not duplicated, processAll() at runtime | sum, mix |
| true | yes | no | ✓ | Not duplicated, expand() replaces it | spread, pan, reverse, take |

**Note:** `expand()` and `processAll()` are mutually exclusive. A device handles poly either at graph-time (expand) or runtime (processAll), never both.

---

## Device Categories

### Category 1: Normal Devices (95% of devices)

`polyphonic: false`, no `expand()`. Duplicated when upstream is poly.

```typescript
export const lpf = device("lpf", {
  inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
  outputs: ["audio"],
  defaultInput: "input",
  defaultOutput: "audio",
  process(inp) {
    // Always receives scalars
    return { audio: filtered };
  },
});
```

### Category 2: Semantic Expanders (chord, seq)

`polyphonic: false`, has `expand()`. Duplicated first, then each expands.

```typescript
export const chord = device("chord", {
  inputs: inputs({ root: 440 }),
  config: { type: "maj" },
  outputs: ["cv"],
  expand(config, inputBindings) {
    const intervals = getIntervals(config.type);  // [0, 4, 7]
    return intervals.map(interval =>
      chordTone({ root: inputBindings.root, interval })
    );
  },
});
```

### Category 3: Poly Processors (sum, mix)

`polyphonic: true`, no `expand()`, has `processAll()`. Not duplicated, processes all voices at runtime.

```typescript
export const sum = device("sum", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  polyphonic: true,
  processAll(inputs, cfg, state, sr) {
    const voices = inputs.input as number[];
    let total = 0;
    for (const v of voices) total += v;
    return { signal: total };
  },
});
```

### Category 4: Poly Expanders (spread, pan, reverse, take)

`polyphonic: true`, has `expand()`. Not duplicated, receives poly inputs, creates new graph structure.

```typescript
// Reverse voice order
export const reverse = device("reverse", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  polyphonic: true,
  expand(config, inputBindings) {
    const voices = toArray(inputBindings.input);
    return voices.reverse().map(v => thru(v));
  },
});

// Double each voice
export const double = device("double", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  polyphonic: true,
  expand(config, inputBindings) {
    const voices = toArray(inputBindings.input);
    return voices.flatMap(v => [thru(v), thru(v)]);
  },
});

// Take first N voices
export const take = device("take", {
  inputs: inputs({ input: 0 }),
  config: { n: 1 },
  outputs: ["signal"],
  polyphonic: true,
  expand(config, inputBindings) {
    const voices = toArray(inputBindings.input);
    return voices.slice(0, config.n).map(v => thru(v));
  },
});

// Stereo spread
export const spread = device("spread", {
  inputs: inputs({ input: 0, width: 1 }),
  outputs: ["left", "right"],
  polyphonic: true,
  expand(config, inputBindings) {
    const voices = toArray(inputBindings.input);
    const w = inputBindings.width;
    return [
      stereoMixer({ voices, width: w, channel: "left" }),
      stereoMixer({ voices, width: w, channel: "right" })
    ];
  },
});

// Pan (sum to mono, then stereo)
export const pan = device("pan", {
  inputs: inputs({ input: 0, pan: 0 }),
  outputs: ["signal"],
  polyphonic: true,
  expand(config, inputBindings) {
    const input = inputBindings.input;
    const p = inputBindings.pan;

    const mono = isPolyInput(input) ? sum(input) : input;

    return [mono.panLeft(p), mono.panRight(p)];
  },
});
```

---

## poly() Is Just a Device

poly() is a regular pass-through device. Nothing special about it.

```typescript
export const poly = device("poly", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  defaultInput: "input",
  defaultOutput: "signal",
  process(inp) {
    return { signal: inp.input as number };
  },
});
```

When called with array:
```javascript
poly([saw(220), saw(330)])  // input = [OutputRef(saw1), OutputRef(saw2)]
```

- Array in input → expansion duplicates poly → poly.0 passes saw1, poly.1 passes saw2
- Downstream sees 2 voices via nodeMap
- Chaining works: `poly([...]).lpf(800).spread().out()`

---

## Uniform Device API

**ALL devices work identically:**

| Feature | poly() | saw() | lpf() | spread() |
|---------|--------|-------|-------|----------|
| Positional args | ✓ | ✓ | ✓ | ✓ |
| Object args | ✓ | ✓ | ✓ | ✓ |
| Method setters | ✓ | ✓ | ✓ | ✓ |
| Chaining | ✓ | ✓ | ✓ | ✓ |
| Array input | ✓ | ✓ | ✓ | ✓ |

No special cases. No "spread doesn't chain" or "poly needs object args".

---

## Serialization Boundary

Device authors must be careful about what goes in `process()` or `processAll()`:

**Bad - closure capture:**
```typescript
function createMixer(voiceCount: number) {
  return device({
    process(inp) {
      for (let i = 0; i < voiceCount; i++) { ... }  // voiceCount undefined at runtime!
    }
  });
}
```

**Good - use config:**
```typescript
function createMixer(voiceCount: number) {
  return device({
    config: { voiceCount },
    process(inp, cfg) {
      for (let i = 0; i < cfg.voiceCount; i++) { ... }  // Works
    }
  });
}
```

Config is serialized and available in worklet. Closures are lost.

---

## Comprehensive Example

Let's trace through:

```javascript
clock(120).apply(c => {
  let s = seq("{c3, e3, g3}").clk(c)

  let v0 = s.voices[0].saw()
  let v1 = s.voices[1].tri()
  let v2 = s.voices[2].sin()

  let e0 = v0.gain(s.voices[0].gate.ad())
  let e1 = v1.gain(s.voices[1].gate.ad())
  let e2 = v2.gain(s.voices[2].gate.ad())

  poly([e0, e1, e2]).spread().out()
})
```

### Phase 1: API Time

```
clock1: { device: "clock", inputs: { bpm: 120 } }

seq2: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "{c3,e3,g3}" } }

saw3: { device: "saw", inputs: { freq: VoiceRef(seq2, 0, "cv") } }
tri4: { device: "tri", inputs: { freq: VoiceRef(seq2, 1, "cv") } }
sin5: { device: "sin", inputs: { freq: VoiceRef(seq2, 2, "cv") } }

ad6: { device: "ad", inputs: { gate: VoiceRef(seq2, 0, "gate") } }
ad7: { device: "ad", inputs: { gate: VoiceRef(seq2, 1, "gate") } }
ad8: { device: "ad", inputs: { gate: VoiceRef(seq2, 2, "gate") } }

gain9: { device: "gain", inputs: { input: OutputRef(saw3), level: OutputRef(ad6) } }
gain10: { device: "gain", inputs: { input: OutputRef(tri4), level: OutputRef(ad7) } }
gain11: { device: "gain", inputs: { input: OutputRef(sin5), level: OutputRef(ad8) } }

poly12: { device: "poly", inputs: { input: [OutputRef(gain9), OutputRef(gain10), OutputRef(gain11)] } }

spread13: { device: "spread", inputs: { input: OutputRef(poly12) } }

out14: { device: "out", inputs: { input: OutputRef(spread13) } }
```

### Phase 2: Expansion (Topological Order)

**clock1:** No poly upstream, no expand. Kept as-is.
```
nodeMap: { clock1: ["clock1"] }
```

**seq2:** Has expand(), not polyphonic.
- No poly upstream, so not duplicated
- expand() creates 3 mono seqs
- Context captures all 3
```
seq2.0: { pattern: "c3", clk: OutputRef(clock1) }
seq2.1: { pattern: "e3", clk: OutputRef(clock1) }
seq2.2: { pattern: "g3", clk: OutputRef(clock1) }
nodeMap: { ..., seq2: ["seq2.0", "seq2.1", "seq2.2"] }
```

**saw3:** Input is VoiceRef(seq2, 0, "cv").
- Resolve: seq2 → ["seq2.0", "seq2.1", "seq2.2"]
- Pick index 0 → "seq2.0"
- VoiceRef becomes OutputRef(seq2.0, "cv")
- Mono input, no duplication
```
saw3: { freq: OutputRef(seq2.0, "cv") }
nodeMap: { ..., saw3: ["saw3"] }
```

**tri4, sin5:** Same pattern with indices 1, 2.
```
tri4: { freq: OutputRef(seq2.1, "cv") }
sin5: { freq: OutputRef(seq2.2, "cv") }
```

**ad6, ad7, ad8:** VoiceRefs resolve to gate outputs.
```
ad6: { gate: OutputRef(seq2.0, "gate") }
ad7: { gate: OutputRef(seq2.1, "gate") }
ad8: { gate: OutputRef(seq2.2, "gate") }
```

**gain9, gain10, gain11:** Regular OutputRefs, mono.
```
gain9: { input: OutputRef(saw3), level: OutputRef(ad6) }
gain10: { input: OutputRef(tri4), level: OutputRef(ad7) }
gain11: { input: OutputRef(sin5), level: OutputRef(ad8) }
```

**poly12:** Has array input [gain9, gain10, gain11].
- Not polyphonic, no expand
- Array triggers duplication: 3 copies
- Each poly.N passes through one gain
```
poly12.0: { input: OutputRef(gain9) }
poly12.1: { input: OutputRef(gain10) }
poly12.2: { input: OutputRef(gain11) }
nodeMap: { ..., poly12: ["poly12.0", "poly12.1", "poly12.2"] }
```

**spread13:** Has `polyphonic: true` and `expand()`.
- Input OutputRef(poly12) → resolves to array [poly12.0, poly12.1, poly12.2]
- Not duplicated (polyphonic)
- expand() runs with context, receives poly array
- Creates L/R mixers referencing all 3 voices
- Context captures both mixers
- Returns [leftMixer, rightMixer]
```
_left1: { v0: OutputRef(poly12.0), v1: OutputRef(poly12.1), v2: OutputRef(poly12.2) }
_right2: { v0: OutputRef(poly12.0), v1: OutputRef(poly12.1), v2: OutputRef(poly12.2) }
nodeMap: { ..., spread13: ["_left1", "_right2"] }
```

**out14:** Input OutputRef(spread13) → [_left1, _right2].
- Not polyphonic, no expand
- Poly count 2 → duplicate
```
out14.0: { input: OutputRef(_left1) } → Left channel
out14.1: { input: OutputRef(_right2) } → Right channel
```

### Final Graph

```
clock1
  ↓
seq2.0 (c3) ──→ saw3 ──→ gain9 ──→ poly12.0 ──┐
seq2.1 (e3) ──→ tri4 ──→ gain10 ─→ poly12.1 ──┼──→ _left1 ──→ out14.0 (L)
seq2.2 (g3) ──→ sin5 ──→ gain11 ─→ poly12.2 ──┤
        ↓           ↓           ↓             └──→ _right2 ─→ out14.1 (R)
       ad6         ad7         ad8
```

- Each voice gets different waveshape (saw/tri/sin)
- Each voice has its own envelope from its own gate
- Voices are collected into poly, then spread to stereo
- All VoiceRefs resolved correctly
- All internal nodes captured

---

## Implementation Checklist

### Core Changes

1. **Add VoiceRef and VoiceRef[]** to NodeInput union
2. **Add voices accessor** to WrappedNode via Proxy
3. **Add expand context** mechanism
4. **Update expandPoly** to:
   - Resolve VoiceRefs and VoiceRef[] before expansion
   - Use runExpand() to capture all nodes
   - Add context.createdNodes to graph
   - Only use returned outputs for nodeMap

### Device Fixes

1. **pan.ts** - Use sum() device instead of inline createSummer()
2. **spread.ts** - Use config instead of closure for voiceCount
3. **seq.ts** - Already correct

### Validation

1. VoiceRef out of range errors at expansion time
2. VoiceRef on non-poly source: index 0 works, 1+ errors
3. All arrays eliminated before compile time
4. expand() and processAll() are mutually exclusive (enforce at device registration)

---

## Resolved Questions

| Question | Answer |
|----------|--------|
| VoiceRef on mono source | `voices[0]` works, `voices[1+]` errors |
| expand() contract | Returns outputs, context captures internals |
| poly() special? | No, regular pass-through device |
| polyphonic flag meaning | "Don't duplicate me, I consume poly" |
| expand vs processAll | Mutually exclusive - graph-time vs runtime |
| Can expand return expanders? | Yes, topological walk handles it naturally |

---

## Future Consideration: Do We Need Mono/Poly Distinction?

VCV Rack makes all cables polyphonic (up to 16 channels). No graph duplication - each device processes all lanes.

Our model duplicates the graph. `saw([440, 550])` becomes two saw nodes.

**Potential benefits of "all cables poly":**
- Simpler graph (fewer nodes)
- No expansion pass
- SIMD-friendly (future)

**Potential costs:**
- Every device must handle arrays
- Can't route individual voices differently
- process() becomes more complex

This is a research question for a future session. The current proposal works with the structure model (graph duplication).
