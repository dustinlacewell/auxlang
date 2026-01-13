# WASM Devices

Heavy DSP in AssemblyScript compiled to WebAssembly.

## Current WASM Devices

- **Reverb**: Dattorro plate reverb (`native/assembly/dattorro.ts`)
- **Filters**: Cytomic SVF - lpf, hpf, bpf, notch (`native/assembly/svf.ts`)
- **Tape Delay**: With wow/flutter (`native/assembly/tape*.ts`)

## Architecture

```
native/assembly/*.ts  → asc compiler → public/*.wasm
src/devices/*.ts      → wrapper with wasmUrl field
```

Per-node WASM instantiation for independent state.

## Required WASM Exports

```typescript
export function init(sampleRate: f32): void
export function process(input: f32): f32
export function set_<param>(value: f32): void

// Optional: state preservation for re-eval
export function get_state_size(): i32
export function serialize(ptr: i32): void
export function deserialize(ptr: i32): void
```

Setters called per-sample for audio-rate modulation.

## State Serialization

For re-eval state preservation, WASM devices can export serialize/deserialize functions. The runtime:
1. Calls `get_state_size()` to allocate buffer
2. Calls `serialize(ptr)` to write state to buffer
3. Creates new WASM instance for new graph
4. Calls `deserialize(ptr)` to restore state

This preserves filter state, delay buffers, reverb tails across code changes.

## TS Device Wrapper

```typescript
export const lpf = device({
  inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
  outputs: ["out"],
  wasmUrl: "/filter.wasm",
  // JS fallback in process()
})
```

## Fallback-First

Every WASM device has complete JS fallback. WASM is performance enhancement.

## Build

```bash
cd native && npm run build:reverb
cp native/build/reverb.wasm public/
```

## Decisions

- D040-D047: WASM infrastructure
- D046: Dattorro plate reverb
- D047: Cytomic SVF

## See Also

- [native/assembly/](../native/assembly/) - WASM source
- [src/core2/runtime/worklet/graph/wasm-state.ts](../src/core2/runtime/worklet/graph/wasm-state.ts) - serialization helpers
