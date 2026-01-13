# Descriptor System

Lazy evaluation with proxy-based input/output access.

## Core Concept

Code builds a DAG of descriptors. Only nodes reachable from `out()` are reified.

```javascript
const o = saw(440)           // descriptor created, not running
const filtered = lpf(o)      // another descriptor
out(filtered)                // NOW the graph is compiled and runs
```

## Typing

`Descriptor<I, C, O>` where:
- I = input keys
- C = config keys
- O = output keys

Enables IDE autocomplete: `.pitch()`, `.cutoff()`, `.out`

## Input Methods

```javascript
saw(440)              // default input (pitch)
lpf(osc).cutoff(800)  // named input
```

Each call returns NEW descriptor with new identity.

## Outputs

```javascript
seq.cv     // named output
saw.out    // default output (can be omitted when connecting)
```

## Device Definition

```javascript
export const saw = device({
  inputs: inputs({ pitch: 440 }),
  outputs: ["out"],
  defaultInput: "pitch",
  defaultOutput: "out",
  process(inp, cfg, state, sr) { ... }
})
```

## Serialization

Process functions serialized via `toString()`, hydrated via `new Function()` in worklet.

Helpers must be on `globalThis` or defined inside process.

## Decisions

- D012: Descriptors are lazy
- D014-D019: Input/output conventions
- D021: Process serialization
- D026: Fully typed descriptors

## See Also

- [src/core2/wrap/](../src/core2/wrap/) - core2 implementation (WrappedNode proxies)
- [src/core2/graph/](../src/core2/graph/) - graph building
- [docs/core2-internals.md](core2-internals.md) - detailed architecture
