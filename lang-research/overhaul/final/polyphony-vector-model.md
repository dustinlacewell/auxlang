# Alternative Model: Vector Cables, No Duplication

## Executive Summary

This document explores an alternative polyphony model inspired by VCV Rack:

1. **All cables are vectors** - Every connection carries 1-N channels
2. **No graph duplication** - Nodes are never cloned for polyphony
3. **No expansion pass** - Graph structure is fixed at API time
4. **Simple device code** - Devices implement scalar `process`, framework handles vectorization
5. **Opt-in vector control** - Devices that need cross-voice logic use `processAll`

The result is a simpler graph, simpler device code, and fully dynamic channel counts.

---

## Core Principle: Cables Are Vectors

In the current model:
```
saw([440, 550]).lpf(800).out()
```
Expands to two saws, two lpfs, two outs - 6 nodes.

In the vector model:
```
saw([440, 550]).lpf(800).out()
```
Creates one saw, one lpf, one out - 3 nodes. Each cable carries 2 channels.

---

## Device Contract

Devices implement ONE of:

### Option A: `process(inp, cfg, state, sr) → outputs`

Framework calls it N times per sample (once per voice). Receives scalars.

```typescript
export const saw = device("saw", {
  inputs: { freq: 440, min: -1, max: 1 },
  outputs: ["cv"],
  process(inp, cfg, state, sr) {
    state.phase = ((state.phase ?? 0) + inp.freq / sr) % 1;
    const raw = state.phase * 2 - 1;
    return { cv: inp.min + (raw + 1) / 2 * (inp.max - inp.min) };
  },
});
```

Device author writes simple scalar code. Framework handles:
- Resolving inputs to arrays
- Broadcasting mismatched channel counts
- Calling process() for each voice
- Managing per-voice state
- Flattening output arrays

### Option B: `processAll(inp, cfg, state, sr) → outputs`

Framework calls it once with all channels. Receives arrays.

```typescript
export const sum = device("sum", {
  inputs: { input: 0 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    let total = 0;
    for (const v of inp.input) total += v;
    return { signal: [total] };
  },
});
```

Used when device needs cross-voice logic (mixing, spreading, reducing).

### Return Values: Scalar or Array

Both `process` and `processAll` can return scalars OR arrays per output. The framework flattens everything:

```typescript
// process returning scalar (typical)
process(inp, cfg, state, sr) {
  return { cv: 0.5 };  // One value per call
}

// process returning array (poly generator)
process(inp, cfg, state, sr) {
  return { cv: [0.5, 0.7, 0.3] };  // Multiple values per call
}

// processAll returning array (typical)
processAll(inp, cfg, state, sr) {
  return { signal: inp.input };  // Pass through
}

// processAll returning scalar (reducer)
processAll(inp, cfg, state, sr) {
  return { signal: sum(inp.input) };  // Reduce to one
}
```

The framework concatenates all returns into final output arrays.

---

## Framework Runtime

```typescript
function processNode(node, outputs, nodeStates, sr) {
  const spec = getDeviceSpec(node.device);
  const state = nodeStates.get(node.id) ?? {};
  nodeStates.set(node.id, state);

  // Resolve all inputs to arrays
  const inputArrays: Record<string, number[]> = {};
  for (const [name, binding] of Object.entries(node.inputs)) {
    inputArrays[name] = resolveToArray(binding, outputs);
  }

  // Determine voice count from max input length
  const voiceCount = Math.max(1, ...Object.values(inputArrays).map(a => a.length));

  if (spec.processAll) {
    // Device handles vectors directly
    const result = spec.processAll(inputArrays, node.config, state, sr);
    outputs.set(node.id, normalizeOutputs(result));
  } else {
    // Framework loops, calling process() per voice
    state.voices ??= [];
    const outputArrays: Record<string, number[]> = {};

    for (let v = 0; v < voiceCount; v++) {
      state.voices[v] ??= {};

      // Broadcast: pick voice v from each input (wrap for shorter arrays)
      const scalarInputs: Record<string, number> = {};
      for (const [name, arr] of Object.entries(inputArrays)) {
        scalarInputs[name] = arr[v % arr.length];
      }

      const result = spec.process!(scalarInputs, node.config, state.voices[v], sr);

      // Flatten: device can return scalar or array per output
      for (const [outName, value] of Object.entries(result)) {
        outputArrays[outName] ??= [];
        if (Array.isArray(value)) {
          outputArrays[outName].push(...value);
        } else {
          outputArrays[outName].push(value);
        }
      }
    }

    outputs.set(node.id, outputArrays);
  }
}

function normalizeOutputs(result: Record<string, number | number[]>): Record<string, number[]> {
  const normalized: Record<string, number[]> = {};
  for (const [name, value] of Object.entries(result)) {
    normalized[name] = Array.isArray(value) ? value : [value];
  }
  return normalized;
}

function resolveToArray(binding, outputs): number[] {
  if (typeof binding === "number") {
    return [binding];
  }
  if (Array.isArray(binding)) {
    // Array of numbers or refs
    return binding.flatMap(b => resolveToArray(b, outputs));
  }
  if (isOutputRef(binding)) {
    return outputs.get(binding.ref)?.[binding.out] ?? [0];
  }
  if (typeof binding === "function") {
    return [binding(/* ... */)];
  }
  return [0];
}
```

---

## Broadcasting Rules

When inputs have different channel counts, shorter arrays broadcast (wrap around):

```javascript
lfo([1, 2, 3], [0.1, 0.2], 0.5)
// freq: [1, 2, 3]   → 3 channels
// min:  [0.1, 0.2]  → 2 channels
// max:  [0.5]       → 1 channel
// voiceCount = max(3, 2, 1) = 3

// Voice 0: { freq: 1, min: 0.1, max: 0.5 }
// Voice 1: { freq: 2, min: 0.2, max: 0.5 }
// Voice 2: { freq: 3, min: 0.1, max: 0.5 }  ← min wraps: 2 % 2 = 0
```

This is the same rule VCV Rack uses.

---

## Device Categories

### Category 1: Signal Processors (95% of devices)

Use `process`. Simple scalar code.

```typescript
export const lpf = device("lpf", {
  inputs: { input: 0, cutoff: 1000, resonance: 0 },
  outputs: ["audio"],
  process(inp, cfg, state, sr) {
    // Standard biquad filter - scalar code
    // state is per-voice, managed by framework
    return { audio: filteredSample };
  },
});

export const adsr = device("adsr", {
  inputs: { gate: 0, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
  outputs: ["cv"],
  process(inp, cfg, state, sr) {
    // Envelope logic - scalar code
    return { cv: envelopeValue };
  },
});

export const delay = device("delay", {
  inputs: { input: 0, time: 0.5, feedback: 0.5 },
  outputs: ["audio"],
  process(inp, cfg, state, sr) {
    // Delay line - scalar code, state.buffer is per-voice
    return { audio: delayedSample };
  },
});
```

### Category 2: Reducers

Use `processAll`. Need to see all voices.

```typescript
export const sum = device("sum", {
  inputs: { input: 0 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    let total = 0;
    for (const v of inp.input) total += v;
    return { signal: [total] };
  },
});

export const mix = device("mix", {
  inputs: { input: 0 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    const voices = inp.input;
    const n = voices.length;
    let total = 0;
    for (const v of voices) total += v;
    return { signal: [total / Math.sqrt(n)] };  // Constant power
  },
});
```

### Category 3: Stereo Processors

Use `processAll`. Mix voices to L/R.

```typescript
export const spread = device("spread", {
  inputs: { input: 0, width: 1 },
  outputs: ["left", "right"],
  processAll(inp, cfg, state, sr) {
    const voices = inp.input;
    const width = inp.width[0];
    const n = voices.length;

    let left = 0, right = 0;
    for (let i = 0; i < n; i++) {
      const pan = n === 1 ? 0 : ((i / (n - 1)) * 2 - 1) * width;
      const leftGain = Math.cos((pan + 1) * Math.PI / 4);
      const rightGain = Math.sin((pan + 1) * Math.PI / 4);
      left += voices[i] * leftGain;
      right += voices[i] * rightGain;
    }

    const scale = 1 / Math.sqrt(n);
    return { left: [left * scale], right: [right * scale] };
  },
});

export const pan = device("pan", {
  inputs: { input: 0, pan: 0 },
  outputs: ["left", "right"],
  processAll(inp, cfg, state, sr) {
    // Sum inputs first, then pan
    let mono = 0;
    for (const v of inp.input) mono += v;
    mono /= Math.sqrt(inp.input.length);

    const p = inp.pan[0];
    const leftGain = Math.cos((p + 1) * Math.PI / 4);
    const rightGain = Math.sin((p + 1) * Math.PI / 4);

    return { left: [mono * leftGain], right: [mono * rightGain] };
  },
});
```

### Category 4: Poly Generators

Use `process`, return arrays. Framework calls once per input voice, device returns M voices each time.

```typescript
export const seq = device("seq", {
  inputs: { clk: 0 },
  config: { pattern: "" },
  outputs: ["cv", "gate", "trig"],
  process(inp, cfg, state, sr) {
    const expr = state.expr ??= parseExpr(cfg.pattern);
    const n = voiceCount(expr);

    state.voiceStates ??= Array(n).fill(null).map(() => ({}));

    const cv = [], gate = [], trig = [];
    for (let v = 0; v < n; v++) {
      const result = traverseVoice(expr, v, inp.clk, state.voiceStates[v], sr);
      cv.push(result.cv);
      gate.push(result.gate);
      trig.push(result.trig);
    }

    return { cv, gate, trig };  // Returns arrays, framework flattens
  },
});

export const chord = device("chord", {
  inputs: { root: 440 },
  config: { type: "maj" },
  outputs: ["cv"],
  process(inp, cfg, state, sr) {
    const intervals = getIntervals(cfg.type);  // e.g., [0, 4, 7] for major

    const cv = intervals.map(semitones =>
      inp.root * Math.pow(2, semitones / 12)
    );

    return { cv };  // Returns array, framework flattens
  },
});
```

With a 3-channel clock driving a 3-voice seq: framework calls `process` 3 times, each returns 3 voices, total = 9 output channels.

**Routing implication:** All 9 voices are flattened together. You can't route the first clock's voices differently from the second clock's voices. If you need per-clock-group routing, create separate seq instances:

```javascript
let c = clock(120)
let s1 = seq("{c3, e3, g3}").clk(c)  // 3 voices → saw → effects A
let s2 = seq("{c4, e4, g4}").clk(c)  // 3 voices → tri → effects B

s1.saw().lpf(800).spread().out()
s2.tri().hpf(400).spread().out()
```

This is arguably clearer than relying on implicit multi-clock expansion anyway.

### Category 5: Channel Manipulators

Use `processAll`. Change channel count or order.

```typescript
export const pick = device("pick", {
  inputs: { input: 0 },
  config: { index: 0 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    const i = cfg.index;
    return { signal: [inp.input[i] ?? 0] };
  },
});

export const take = device("take", {
  inputs: { input: 0 },
  config: { n: 1 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    return { signal: inp.input.slice(0, cfg.n) };
  },
});

export const reverse = device("reverse", {
  inputs: { input: 0 },
  outputs: ["signal"],
  processAll(inp, cfg, state, sr) {
    return { signal: [...inp.input].reverse() };
  },
});
```

---

## VoiceRef: Individual Voice Access

`voices[n]` creates a `pick` device:

```javascript
let s = seq("{c4, e4, g4}")
s.voices[0]        // → pick({ input: s.cv, index: 0 })
s.voices[0].saw()  // → pick(...).saw()  → 1-channel saw
```

Implementation in wrap:

```typescript
if (prop === "voices") {
  return new Proxy({}, {
    get(_, index) {
      if (typeof index === "string" && !isNaN(Number(index))) {
        return wrap(createNode("pick", {
          input: { ref: node.id, out: spec.defaultOutput }
        }, { index: Number(index) }));
      }
    }
  });
}
```

Since pick outputs 1 channel, downstream is mono.

---

## The out() Device

Routes to stereo hardware. Distributes voices round-robin.

```typescript
export const out = device("out", {
  inputs: { input: 0 },
  outputs: [],
  processAll(inp, cfg, state, sr) {
    const voices = inp.input;
    let left = 0, right = 0;

    for (let i = 0; i < voices.length; i++) {
      if (i % 2 === 0) left += voices[i];
      else right += voices[i];
    }

    const scale = 1 / Math.sqrt(voices.length);
    return { _left: left * scale, _right: right * scale };
  },
});
```

---

## Comprehensive Example

```javascript
clock(120).apply(c => {
  let s = seq("{c3, e3, g3}").clk(c)
  s.saw().gain(s.gate.adsr()).spread().out()
})
```

### Graph (5 nodes, no duplication)

```
clock1 → seq2 → saw3 → gain4 → spread5 → out6
              ↘ adsr4a ↗
```

Wait, adsr needs gate from seq. Let me redo:

```
clock1: { device: "clock", inputs: { bpm: 120 } }
seq2: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "{c3,e3,g3}" } }
saw3: { device: "saw", inputs: { freq: OutputRef(seq2, "cv") } }
adsr4: { device: "adsr", inputs: { gate: OutputRef(seq2, "gate") } }
gain5: { device: "gain", inputs: { input: OutputRef(saw3), level: OutputRef(adsr4) } }
spread6: { device: "spread", inputs: { input: OutputRef(gain5) } }
out7: { device: "out", inputs: { input: OutputRef(spread6) } }
```

7 nodes total. In duplication model: 1 + 3 + 3 + 3 + 3 + 1 + 2 = 16 nodes.

### Runtime (one sample)

**clock1** (process, 1 voice):
```
outputs["clock1"] = { trig: [1], reset: [0] }
```

**seq2** (processAll, outputs 3 channels):
```
inputs: { clk: [1] }
outputs["seq2"] = { cv: [130.8, 164.8, 196.0], gate: [1, 1, 1], trig: [1, 1, 1] }
```

**saw3** (process, called 3 times):
```
inputs: { freq: [130.8, 164.8, 196.0] }
  process({ freq: 130.8 }, ..., state.voices[0]) → { cv: 0.2 }
  process({ freq: 164.8 }, ..., state.voices[1]) → { cv: -0.4 }
  process({ freq: 196.0 }, ..., state.voices[2]) → { cv: 0.7 }
outputs["saw3"] = { cv: [0.2, -0.4, 0.7] }
```

**adsr4** (process, called 3 times):
```
inputs: { gate: [1, 1, 1] }
  process({ gate: 1 }, ..., state.voices[0]) → { cv: 0.8 }
  process({ gate: 1 }, ..., state.voices[1]) → { cv: 0.6 }
  process({ gate: 1 }, ..., state.voices[2]) → { cv: 0.9 }
outputs["adsr4"] = { cv: [0.8, 0.6, 0.9] }
```

**gain5** (process, called 3 times):
```
inputs: { input: [0.2, -0.4, 0.7], level: [0.8, 0.6, 0.9] }
  process({ input: 0.2, level: 0.8 }) → { audio: 0.16 }
  process({ input: -0.4, level: 0.6 }) → { audio: -0.24 }
  process({ input: 0.7, level: 0.9 }) → { audio: 0.63 }
outputs["gain5"] = { audio: [0.16, -0.24, 0.63] }
```

**spread6** (processAll):
```
inputs: { input: [0.16, -0.24, 0.63], width: [1] }
// Pan positions: voice0 → left, voice1 → center, voice2 → right
outputs["spread6"] = { left: [0.28], right: [0.35] }
```

**out7** (processAll):
```
inputs: { input: [0.28, 0.35] }  // 2 channels from spread's left/right
// Even indices → left, odd → right
_left = 0.28, _right = 0.35
```

---

## Implementation Changes from Current Model

### Remove

- `expand-poly.ts` - No expansion pass
- `polyphonic` flag - No longer needed
- `expand` hook - No longer needed
- Node duplication logic - Gone

### Modify

**node.ts** - Same structure, but arrays stay as arrays:
```typescript
interface Node {
  id: NodeId;
  device: string;
  inputs: Record<string, NodeInput>;
  config: Record<string, ConfigValue>;
}
```

**device-spec.ts**:
```typescript
interface DeviceSpec {
  inputs: Record<string, InputDef>;
  outputs: readonly string[];
  config?: Record<string, ConfigValue>;

  // Exactly one of:
  process?: ProcessFn;      // Scalar, framework loops
  processAll?: ProcessAllFn; // Vector, device handles
}
```

**compile.ts** - Simpler, no array elimination check:
```typescript
function compile(graph: FlatGraph): RuntimeGraph {
  const sorted = topologicalSort(graph.nodes);
  return {
    nodes: sorted.map(node => ({
      id: node.id,
      device: node.device,
      inputs: node.inputs,  // Keep as-is, resolve at runtime
      config: node.config,
    })),
  };
}
```

**processor.ts** - New runtime loop (shown above)

### Add

**wrap.ts** - `voices` accessor:
```typescript
if (prop === "voices") {
  return new Proxy({}, {
    get(_, index) {
      if (typeof index === "string" && !isNaN(Number(index))) {
        return wrap(createNode("pick", {
          input: { ref: node.id, out: spec.defaultOutput }
        }, { index: Number(index) }));
      }
    }
  });
}
```

---

## Tradeoffs

### Advantages

1. **Fewer nodes** - No duplication, smaller graphs
2. **Simpler device code** - Scalar `process` for 95% of devices
3. **No expansion pass** - Simpler pipeline
4. **Fully dynamic** - Channel count can change at runtime
5. **VCV Rack mental model** - Familiar to modular users
6. **Flexible returns** - Devices can return scalar or array, framework flattens

### Disadvantages

1. **Per-voice state management** - Framework must track `state.voices[]`
2. **Runtime overhead** - Loop per node per sample (but similar to current duplication)
3. **processAll complexity** - Reducers/spreaders need to handle arrays
4. **Flattened routing** - Multi-channel inputs produce flattened outputs; can't route subgroups separately without explicit node separation

### Neutral

1. **No WASM change** - WASM devices already process scalars, framework loops
2. **Similar performance** - Trading node count for loop iterations

---

## Summary

The vector model eliminates graph duplication entirely. Devices write simple scalar code, the framework handles vectorization. Devices that need cross-voice logic opt into `processAll`.

Key simplifications:
- No `expand` hook
- No `polyphonic` flag
- No expansion pass
- No node duplication
- No compile-time channel analysis

The mental model becomes: "cables carry N channels, nodes process all of them."
