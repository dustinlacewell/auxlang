# WASM Native Devices Research

This document captures our exploration of using WebAssembly for performance-critical audio devices.

---

## Motivation

The audio processing hot path runs 48,000 times per second per device. Heavy devices like oscillators with polyphony, filters, and reverbs can become bottlenecks. WASM offers:

- Near-native performance for math-heavy operations
- SIMD potential (process multiple voices in parallel)
- No GC pauses in the audio thread

### Heavy Device Candidates

| Device | Why Heavy |
|--------|-----------|
| Oscillators with anti-aliasing | PolyBLEP math per sample per voice |
| Filters (Moog ladder, SVF) | 4+ stages of feedback math |
| Reverb | 8 comb filters + 4 allpass filters |
| Convolution | FFT-based, block processing |
| Supersaw | Multiple detuned oscillators summed |

---

## VCV Rack 3 Discussion (Context)

From a Discord conversation with VCV Rack's author about buffer processing:

> **VCV-Andrew**: Rack 3 will probably have buffer processing... My idea is that your module can tell Rack its minimum and maximum buffer size, and Rack will ask your module for N samples when it can.

Key insights:
- Modules declare min/max buffer sizes
- Rack determines actual buffer size per module based on graph topology
- Modules in feedback loops get small buffers (possibly 1 sample)
- Modules not in feedback loops can get larger buffers for efficiency
- FFT modules would declare larger minimum (e.g., 512 samples)

This is relevant because WASM performance benefits most from batch processing.

---

## Current Architecture Understanding

1. **Device creation** (browser context): Calling `device()` creates a Descriptor
2. **Graph compilation**: Device process functions get serialized as strings
3. **Worklet hydration**: Process strings are `new Function()`'d back into callables
4. **Sample processing**: Hydrated functions called per sample

```
Browser Context                    Worklet Context
---------------                    ---------------
device() → Descriptor
         ↓
    compile(graph)
         ↓
   { processSource: "..." }  →→→  new Function(processSource)
                                           ↓
                                   process(inp, cfg, state, sr)
```

---

## The Key Question

For a WASM device, what gets serialized?

**Option A: WASM as helper functions (current attempt)**
- Write device in TypeScript
- Process function calls WASM helpers for heavy math
- Problem: Still writing two things (TS device + AS helpers)

**Option B: Entire device in WASM**
- Write the whole device in AssemblyScript
- The Descriptor somehow references the WASM device
- Serialization tells worklet "hydrate from WASM module X, device Y"
- Both contexts load the WASM (browser for Descriptor API, worklet for process)

Option B is cleaner: you write ONE thing (the device in AssemblyScript), and both contexts use it appropriately.

---

## Proposed Architecture (Option B)

### AssemblyScript Device Definition

```typescript
// native/assembly/devices/reverb.ts

// Device metadata (exported for browser-side Descriptor creation)
export const REVERB_INPUTS = { input: 0, room: 0.5, damp: 0.5, wet: 0.33, dry: 0.7 };
export const REVERB_OUTPUTS = ["out"];
export const REVERB_DEFAULT_INPUT = "input";
export const REVERB_DEFAULT_OUTPUT = "out";

// Device state (allocated per instance)
export class ReverbState {
  // comb filters, allpass filters, etc.
}

// Process function (called per sample in worklet)
export function reverbProcess(
  state: ReverbState,
  input: f32,
  room: f32,
  damp: f32,
  wet: f32,
  dry: f32,
  sampleRate: f32
): f32 {
  // actual reverb algorithm
}

// State factory
export function createReverbState(sampleRate: f32): ReverbState {
  return new ReverbState(sampleRate);
}
```

### Browser-Side Wrapper

```typescript
// src/devices/reverb.ts

import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// This is a "native device marker" - the process function is just a stub
// that tells the worklet where to find the real implementation
export const reverb = device({
  inputs: inputs({ input: 0, room: 0.5, damp: 0.5, wet: 0.33, dry: 0.7 }),
  outputs: ["out"],
  defaultInput: "input",
  defaultOutput: "out",

  // Special marker for native device
  native: "reverb",  // ← tells worklet to use WASM reverb

  // Fallback JS implementation (optional)
  process(inp, cfg, state, sampleRate) {
    // JS fallback if WASM unavailable
  }
});
```

### Worklet Hydration

When the worklet sees `native: "reverb"` in the compiled node:

```typescript
function hydrateProcess(node: CompiledNode): ProcessFn {
  if (node.native && wasmDevices[node.native]) {
    // Return a wrapper that calls the WASM device
    const wasmDevice = wasmDevices[node.native];
    return (inp, cfg, state, sr) => {
      // Initialize WASM state if needed
      if (!state.__wasmState) {
        state.__wasmState = wasmDevice.createState(sr);
      }
      // Call WASM process
      return wasmDevice.process(state.__wasmState, inp, sr);
    };
  }
  // Fall back to JS process source
  return new Function(`return (${node.processSource})`)();
}
```

### Loading Flow

```
1. Browser loads WASM module
   - Extracts device metadata (inputs, outputs)
   - Creates Descriptor wrappers

2. User code: reverb(synth).room(0.8)
   - Returns Descriptor with native: "reverb" marker

3. compile(graph)
   - Serializes nodes, native marker preserved

4. Worklet receives graph
   - Already has WASM loaded at init
   - Hydrates native devices from WASM
   - Hydrates JS devices from processSource
```

---

## Current Implementation Status

### Completed

1. **native/ subproject** with AssemblyScript setup
2. **Freeverb algorithm** in AssemblyScript:
   - `assembly/comb-filter.ts` - Comb filter with lowpass feedback
   - `assembly/allpass-filter.ts` - Allpass diffusion filter
   - `assembly/freeverb.ts` - 8 combs + 4 allpasses
   - `assembly/index.ts` - WASM exports
3. **Build working**: `npm run build` produces 8KB WASM
4. **JS fallback reverb**: `src/devices/reverb.ts` with identical algorithm

### Not Yet Implemented

1. Device metadata export from AssemblyScript
2. Browser-side WASM loading for Descriptor creation
3. Native device marker in Descriptor/compilation
4. Worklet WASM loading at init
5. Worklet native device hydration

---

## Open Questions

1. **Dual loading**: Is loading WASM in both contexts acceptable? (Probably yes - it's small)

2. **State management**: How does WASM state integrate with the existing `state: Record<string, unknown>` pattern?

3. **Polyphony**: How do native devices handle polyphonic signals? Process per-channel, or expose channel count to WASM?

4. **Config functions**: Current devices can have config like `.shape(p => p * 2 - 1)`. Native devices can't accept JS functions. Limit to primitive configs?

5. **Block processing**: Should we add optional block processing for native devices? Would significantly improve WASM performance.

---

## Next Steps

1. Design the `native` marker format in DeviceSpec
2. Implement browser-side WASM loader that extracts device metadata
3. Implement worklet-side WASM loader and native hydration
4. Update reverb device to use the native marker pattern
5. Test end-to-end
