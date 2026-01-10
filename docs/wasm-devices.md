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
```

Setters called per-sample for audio-rate modulation.

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
- [lang-research/plans/native-modules.md](../lang-research/plans/native-modules.md) - roadmap
