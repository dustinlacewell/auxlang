# Unified Signal Abstraction

## Core Principle

**Everything's a signal. You can pass any valid signal anywhere a signal is accepted, which is everywhere.**

Signal types:
- `number` - constant
- `SignalLambda` - computed per-sample
- `AnyDescriptor` - device output
- `OutputRef` - explicit reference to device output
- `PolyDescriptor` - multiple signals in parallel
- `Signal[]` - array, treated as poly

## User-Facing API

Arrays passed to device factories expand to poly:

```typescript
saw([440, 550, 660]).lpf(800).out()     // 3-voice poly
seq("{c4,e4,g4}").saw().spread().out()  // pattern creates poly
```

The `poly()` function is for constructing heterogeneous polys:

```typescript
poly([saw(440), tri(550)]).lpf(800)     // mixed oscillator types
poly([440, 550]).saw()                   // also works
```

## Implementation

### Poly Simplification

Poly becomes a simple mapper - it doesn't inspect voice types:

```typescript
get(target, prop) {
  if (prop === "_poly") return true;
  if (prop === "voices") return voices;
  if (prop === "out") return () => outputHandler(voices);

  const factory = getDeviceFactory(prop);
  if (factory) {
    return (params) => {
      const newVoices = voices.map((v, i) =>
        factory(v, resolveForVoice(params, i))
      );
      return poly(newVoices);
    };
  }

  return undefined;
}
```

Key insight: `poly.lpf()` calls `lpf(voice)`, not `voice.lpf()`. The factory handles any signal type.

### Type Changes

```typescript
// PolyDescriptor - user-facing
interface PolyDescriptor {
  readonly _poly: true;
  readonly voices: readonly Signal[];  // any signal type
}

// BoundPoly - after normalization
interface BoundPoly {
  readonly _poly: true;
  readonly voices: readonly BoundSignal[];  // normalized signals
}
```

### Runtime Graph

`connections` sources become heterogeneous:

```typescript
// Before: all same type
type ConnectionsInput = {
  type: "connections";
  sources: { nodeId, output }[];
};

// After: each source resolved independently
type SourceInput =
  | { type: "constant"; value: number }
  | { type: "connection"; nodeId: string; output: string }
  | { type: "lambda"; fn: SignalLambda };

type ConnectionsInput = {
  type: "connections";
  sources: SourceInput[];
};
```

Runtime resolves each source by type:

```typescript
if (binding.type === "connections") {
  inputRecord[name] = binding.sources.map(resolveSource);
}

function resolveSource(source: SourceInput): number {
  switch (source.type) {
    case "constant": return source.value;
    case "lambda": return source.fn(state, sampleRate, time);
    case "connection": return nodes[index].outputRecord[output];
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `types.ts` | `PolyDescriptor.voices: Signal[]`, `BoundPoly.voices: BoundSignal[]` |
| `device.ts` | `normalizeSignal()` recursively normalizes poly voices |
| `poly.ts` | Remove spec dependency, simplify to map factory calls |
| `graph/types.ts` | Add `SourceInput`, update `connections.sources` type |
| `reify.ts` | `resolveInput()` for each poly voice |
| `runtime-graph.ts` | Handle mixed source types in connections |

## Output Accessors

Output accessors (`.cv`, `.gate`, `.trig`) work when voices are descriptors:

```typescript
seq("{c4,e4}").trig.kick()  // each voice's trig → kick
```

For non-descriptor voices, accessing outputs fails at reify time - same as accessing an invalid output on any device. This is the expected behavior.
