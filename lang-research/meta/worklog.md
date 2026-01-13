# Work Log

## 2025-01-12

### Core2 Implementation Complete

- **Ported all devices from v1 to core2**
  - Copied devices with import path changes
  - Fixed config format: v1 used `{ key: { default: value } }`, core2 simplified to `{ key: value }`
  - ConfigValue type: `number | string | boolean | null | object | ((...args: any[]) => any)`

- **Device expand hooks working**
  - seq, chord, spread use expand hooks for compile-time polyphony
  - expand hooks called in API (device factory), not in later pass
  - Extracted `createDeviceNode()` to share expand logic across:
    - `device.ts` factory
    - `wrap.ts` createChainMethod
    - `wrap.ts` array chain method
    - `chainable-output-ref.ts`

- **Argument parsing unified**
  - Extracted `parseArgs()` to `wrap/parse-args.ts`
  - Used by wrap.ts, chainable-output-ref.ts
  - Handles positional args routing to inputs vs config based on spec
  - Skips default input from positional args when chaining (already bound)

- **Poly array wrapping fixed**
  - wrapArray handler was using `target` (the callable function) instead of `nodes`
  - Fixed to use closed-over `nodes` for all operations
  - `chord().tri().gain()` now chains correctly

- **Output ref array chaining**
  - Added `wrapOutputRefArray()` for `s.cv.tri()` on poly seq
  - Poly output access now returns chainable array of OutputRefs
  - Each ref in array maps to new device when chaining

- **Test suite on core2**
  - Created `use-core2-audio.ts` hook
  - Updated test-suite-app.tsx to use core2
  - Created `validate-interactive.test.ts` - runs all 177 interactive tests through core2
  - All 177 tests passing

- **LFO fixed**
  - core2 lfo was missing min/max/phase inputs and positionalArgs
  - Copied full implementation from v1

- **Config function hydration fixed**
  - processor.ts was calling `fn()` for config functions, returning result
  - Fixed to return `fn` itself (the function) for devices to call

- **Seq worklet dependency**
  - core2 worklet needs `globalThis.seqTraverse` for seq process function
  - Added import of `@/runtime/worklet/seq-traverse` to core2 worklet index.ts
