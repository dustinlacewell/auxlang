# Device Author API

What does a device author need to know/do?

## Current Device Definition

```typescript
export const saw = device("saw", {
  inputs: inputs({ freq: 440, detune: 0 }),
  outputs: ["cv", "audio"],
  defaultInput: "freq",
  defaultOutput: "cv",
  process(inp, cfg, state, sr) {
    // Per-sample processing
    // inp.freq is always a number (scalar)
    return { cv: value, audio: value };
  },
});
```

## Device Categories

### Category 1: Normal Device (most devices)

No special poly handling. Gets duplicated automatically when upstream is poly.

```typescript
export const lpf = device("lpf", {
  inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
  outputs: ["audio"],
  defaultInput: "input",
  defaultOutput: "audio",
  process(inp, cfg, state, sr) {
    // Always receives scalars
    const input = inp.input as number;
    const cutoff = inp.cutoff as number;
    // ... filter math
    return { audio: filtered };
  },
});
```

**Author doesn't think about poly at all.** System handles it.

### Category 2: Semantic Expander (chord, seq)

Creates multiple outputs based on config.

```typescript
export const chord = device("chord", {
  inputs: inputs({ root: 440 }),
  config: { type: "maj" },
  outputs: ["cv"],
  defaultInput: "root",
  defaultOutput: "cv",
  process(inp) {
    // Fallback for when expand not used
    return { cv: inp.root as number };
  },
  expand(config, inputBindings) {
    const type = config.type as string;
    const intervals = getIntervals(type);  // [0, 4, 7] for major

    // Create N chordTone nodes
    return intervals.map(interval =>
      chordTone({ root: inputBindings.root, interval })
    );
  },
});
```

**Author implements expand()** to create multiple nodes from config.

### Category 3: Poly Consumer (spread, pan)

Receives poly input, outputs stereo.

```typescript
export const spread = device("spread", {
  inputs: inputs({ input: 0, width: 1 }),
  outputs: ["val"],
  defaultInput: "input",
  defaultOutput: "val",
  polyphonic: true,  // Don't duplicate me
  process(inp) {
    // Fallback for mono
    return { val: inp.input as number };
  },
  expand(config, inputBindings) {
    const input = inputBindings.input;
    const width = inputBindings.width;

    // Normalize to array
    const voices = Array.isArray(input) ? input : [input];
    const n = voices.length;

    // Create L/R mixers (anonymous devices with config)
    const leftMixer = createMixer(n, true);
    const rightMixer = createMixer(n, false);

    // Build inputs for mixers
    const mixerInputs = { width };
    for (let i = 0; i < n; i++) {
      mixerInputs[`v${i}`] = voices[i];
    }

    return [leftMixer(mixerInputs), rightMixer(mixerInputs)];
  },
});
```

**Author implements expand()** that receives poly input as array.

**`polyphonic: true`** tells system "don't duplicate me, give me the array".

## The expand() Contract

```typescript
expand(
  config: Record<string, ConfigValue>,
  inputBindings: Record<string, NodeInput>
): WrappedNode | WrappedNode[]
```

### What expand() receives

- `config` - static config values from node
- `inputBindings` - resolved inputs, may include:
  - `number` - constant
  - `OutputRef` - single connection
  - `OutputRef[]` - poly connections (if polyphonic: true)
  - `VoiceRef` - symbolic voice reference (NEW)

### What expand() returns

- Single `WrappedNode` - replaces original node
- Array of `WrappedNode` - multiple outputs (poly or stereo)

### What expand() can do

- Call device factories to create nodes
- Access config values
- Create anonymous devices via `device({ ... })`

### What expand() must NOT do

- Capture closure variables needed at runtime (serialization bug)
- Reference nodes not in the graph

## Creating Anonymous Devices

For internal nodes (like spread's mixers):

```typescript
function createMixer(voiceCount: number, isLeft: boolean) {
  const voiceInputs: Record<string, number> = { width: 1 };
  for (let i = 0; i < voiceCount; i++) {
    voiceInputs[`v${i}`] = 0;
  }

  return device({
    inputs: inputs(voiceInputs),
    outputs: ["val"],
    defaultInput: "v0",
    defaultOutput: "val",
    config: { voiceCount, isLeft },  // MUST use config, not closure!
    process(inp, cfg) {
      const n = cfg.voiceCount as number;
      const left = cfg.isLeft as boolean;
      // ... process
    },
  });
}
```

**Key rule:** Any value needed at runtime must be in config, not closure.

## VoiceRef Handling

Device authors don't handle VoiceRef directly. System resolves it before expand().

```typescript
expand(config, inputBindings) {
  // inputBindings.input is already resolved:
  // - VoiceRef → OutputRef (by system)
  // - OutputRef stays OutputRef
  // - OutputRef[] stays array
}
```

## Summary: What Device Authors Need to Know

### For normal devices
- Nothing special. Define inputs, process, outputs.
- System handles poly duplication.

### For semantic expanders (chord, seq)
- Implement `expand(config, inputs)`
- Return array of nodes for poly output
- Can use device factories and anonymous devices

### For poly consumers (spread, pan)
- Set `polyphonic: true`
- Implement `expand(config, inputs)` to receive array input
- Return stereo pair [left, right]
- Use config (not closure) for runtime values

### Common pitfalls
1. Don't capture closure variables for process() - use config
2. Return ALL nodes that need to be in graph (or we fix system to track them)
3. Don't assume input types - normalize arrays
