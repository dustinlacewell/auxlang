# WASM Devices

> This describes core2's WASM mechanism. WASM on the core3 module contract is
> backlog (`llm/core3-backlog.md`); the wrapper shape below is core2-specific.

For heavy DSP (filters, reverbs, delays), use AssemblyScript compiled to WASM.

## Structure

```
native/assembly/my-device.ts  → WASM entry point
native/assembly/my-impl.ts    → Implementation class
public/my-device.wasm         → Served to browser
src/devices/my-device.ts      → TS wrapper with wasmUrl
```

## Required WASM Exports

```typescript
export function init(sampleRate: f32): void
export function process(input: f32): f32
export function set_<inputName>(value: f32): void  // per input
```

## TS Device Wrapper

```typescript
export const myDevice = device({
  inputs: inputs({ input: 0, param: 0.5 }),
  outputs: ["out"],
  defaultInput: "input",
  defaultOutput: "out",
  wasmUrl: "/my-device.wasm",
});
```

## Build

```bash
cd native && npm run build:my-device
cp native/build/my-device.wasm public/
```

See `native/assembly/tape*.ts` and `src/devices/tape.ts` for full example.
