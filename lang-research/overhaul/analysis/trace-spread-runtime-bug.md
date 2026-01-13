# Bug: Spread Runtime Error - "voiceCount is not defined"

## Root Cause

`createMixer()` creates an anonymous device whose `process` function captures `voiceCount` from closure:

```typescript
function createMixer(voiceCount: number, isLeft: boolean) {
  return device({
    process(inp) {
      const n = voiceCount;  // Closure capture!
      for (let i = 0; i < n; i++) { ... }
    }
  });
}
```

When the process function is serialized via `.toString()` and sent to AudioWorklet, the closure is lost. The worklet receives:

```javascript
function(inp) {
  const n = voiceCount;  // ERROR: voiceCount is not defined
  ...
}
```

## Same Bug in pan.ts

```typescript
function createSummer(voiceCount: number) {
  return device({
    process(inp) {
      for (let i = 0; i < voiceCount; i++) {  // Also closure capture!
        sum += inp[`v${i}`] ?? 0;
      }
    }
  });
}
```

## Why It Wasn't Caught Earlier

- The bug only manifests at RUNTIME (AudioWorklet execution)
- Graph building and expansion succeed
- Only when worklet tries to run the process function does it fail

## Fix Options

### Option 1: Inline the value

Don't capture from closure. Make process self-contained.

But process() doesn't have access to the voice count. It would need to be passed somehow.

### Option 2: Use config

Pass voiceCount as config, access in process:

```typescript
function createMixer(voiceCount: number, isLeft: boolean) {
  return device({
    config: { voiceCount, isLeft },
    process(inp, cfg) {
      const n = cfg.voiceCount;
      const left = cfg.isLeft;
      // ...
    }
  });
}
```

Config is serialized and available in worklet. This should work.

### Option 3: Count inputs at runtime

```typescript
process(inp) {
  // Count how many v* inputs we have
  let n = 0;
  while (`v${n}` in inp) n++;

  for (let i = 0; i < n; i++) { ... }
}
```

Works but wasteful to count every sample.

### Option 4: Use state initialization

```typescript
process(inp, cfg, state, sr) {
  if (!state.n) {
    state.n = 0;
    while (`v${state.n}` in inp) state.n++;
  }
  for (let i = 0; i < state.n; i++) { ... }
}
```

Count once, cache in state. Still a bit hacky.

## Recommended Fix

Option 2 (config) is cleanest:

```typescript
function createMixer(voiceCount: number, isLeft: boolean) {
  return device({
    inputs: inputs(voiceInputs),
    outputs: ["val"],
    config: { voiceCount, isLeft },  // Pass as config
    defaultInput: "v0",
    defaultOutput: "val",
    process(inp, cfg) {
      const width = (inp.width as number) ?? 1;
      const n = cfg.voiceCount as number;
      const left = cfg.isLeft as boolean;

      let sum = 0;
      for (let i = 0; i < n; i++) {
        const voice = (inp[`v${i}`] as number) ?? 0;
        const basePan = n === 1 ? 0 : -1 + (2 * i) / (n - 1);
        const pan = basePan * width;
        const gain = left ? (1 - pan) / 2 : (1 + pan) / 2;
        sum += voice * gain;
      }

      return { val: sum };
    },
  });
}
```

Same fix needed for `createSummer` in pan.ts.

## Impact

This bug affects:
- spread with ANY poly input
- pan with poly input (beyond the internal node bug)

Both spread and pan are broken for poly inputs due to different bugs:
- **spread:** process function closure serialization (this bug)
- **pan:** internal node not collected (previous bug)

## Conclusion

The "voiceCount is not defined" error is a serialization boundary bug. Closure-captured values are lost when process() is converted to string for AudioWorklet.

Fix: Use config instead of closure capture.
