# Worklet Architecture Redesign

## Problem

Process functions are serialized via `.toString()` and hydrated via `new Function()` in the AudioWorklet. This means they can't reference any external scope - no imports, no shared utilities, no helper functions.

This worked when process functions were fully self-contained. It breaks when they need shared abstractions like PolySignal helpers.

## Current Flow

```
Main Thread                          Worklet
-----------                          -------
device.process.toString()
    → JSON serialize
    → postMessage ────────────────→ new Function(source)
                                     → call with (inp, cfg, state, sr)
```

The hydrated function runs in isolation. Any reference to external code fails.

## Proposed Solution: Worklet Module Environment

AudioWorklet supports ES modules via `audioContext.audioWorklet.addModule()`. The worklet context is persistent - anything loaded stays available.

### New Flow

```
Main Thread                          Worklet
-----------                          -------
audioWorklet.addModule('worklet/utils.js')
audioWorklet.addModule('worklet/processor.js')
                                     ← utils.js loads, sets globalThis.polyUtils
                                     ← processor.js loads, uses polyUtils

device.process.toString()
    → postMessage ────────────────→ new Function(source)
                                     → function can use globalThis.polyUtils
```

### File Structure

```
src/runtime/worklet/
├── utils.ts          # Shared utilities (polyGetValue, polyGetVoiceIds)
├── processor.ts      # GraphProcessor class
└── index.ts          # Entry point that sets up globals
```

### Build Changes

The worklet files need to be bundled separately and served as static assets:

```
public/
├── worklet.js        # Bundled worklet code
├── reverb.wasm
├── filter.wasm
└── tape.wasm
```

Vite config addition:
```ts
build: {
  rollupOptions: {
    input: {
      main: 'index.html',
      worklet: 'src/runtime/worklet/index.ts'
    },
    output: {
      entryFileNames: (chunk) =>
        chunk.name === 'worklet' ? 'worklet.js' : '[name].[hash].js'
    }
  }
}
```

### Runtime Loading

```ts
// In audio-engine.ts or similar
async function initAudio() {
  const ctx = new AudioContext();
  await ctx.audioWorklet.addModule('/worklet.js');
  // Now processor is registered and utils are available
}
```

### Utility API

Utilities are attached to globalThis with a namespace:

```ts
// worklet/utils.ts
type PS = Array<{ id: number; value: number }>;

globalThis.poly = {
  getValue(sig: PS, id: number, def: number): number {
    if (sig.length === 0) return def;
    if (sig.length === 1) return sig[0].value;
    return sig.find(ch => ch.id === id)?.value ?? def;
  },

  getVoiceIds(...sigs: PS[]): number[] {
    let largest: PS = [];
    for (const sig of sigs) {
      if (sig.length > largest.length) largest = sig;
    }
    return largest.map(ch => ch.id);
  }
};
```

Device process functions use them:

```ts
process(inp, cfg, state, sr) {
  const freqs = inp.freq as PS;
  const min = poly.getValue(inp.min, voiceId, -1);
  // ...
}
```

### Type Declarations

For TypeScript, declare the global in a `.d.ts`:

```ts
// src/types/worklet-globals.d.ts
type PS = Array<{ id: number; value: number }>;

declare const poly: {
  getValue(sig: PS, id: number, def: number): number;
  getVoiceIds(...sigs: PS[]): number[];
};
```

## Migration Steps

1. Create `src/runtime/worklet/` directory structure
2. Move processor code, add utils module
3. Configure Vite to bundle worklet separately
4. Update audio engine to load worklet module
5. Update device files to use `poly.*` helpers
6. Run tests, verify audio works

## Benefits

- Clean separation of worklet code
- Shared utilities without serialization hacks
- Extensible - add more utils as needed
- Type-safe with proper declarations
- Follows AudioWorklet best practices

## Risks

- Build complexity increases slightly
- Need to ensure worklet bundle stays small (runs on audio thread)
- Hot reload may need special handling for worklet changes
