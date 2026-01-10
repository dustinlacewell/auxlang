# Current Task

**Device expand/positionalArgs API** - Fixed and Working

## What We Built

Added `expand` and `positionalArgs` to device spec so devices like `seq` and `chord` can:
1. Expand into poly descriptors at construction time
2. Accept positional arguments in a defined order

## Bugs Fixed

1. **Devices with expand returned base descriptor** - Fixed by returning factory function directly
2. **Closure variable not surviving serialization** - Fixed by storing `semitoneOffset` in config as a function
3. **Chained vs direct call detection** - Factory now checks if first arg is OutputRef/Descriptor to detect chaining
4. **defaultInput consumed from positionalArgs when chained** - Fixed: when chained, defaultInput is skipped in positionalArgs loop

## Files Changed

**Core:**
- `src/descriptor/device.ts` - Added `expand`, `positionalArgs`, chaining detection, factory return for expand devices
- `src/descriptor/registry.ts` - Updated DeviceFactory type for rest args
- `src/descriptor/proxy/chainable-output.ts` - Pass all args to factory

**Devices:**
- `src/devices/seq/seq.ts` - Refactored to use `device()` with `expand`, positionalArgs: ["pattern", "clk"]
- `src/devices/chord.ts` - New device with `expand`, uses config function for semitone offset

## The API

```javascript
// Device spec with expand and positionalArgs
export const seq = device("seq", {
  inputs: inputs({ clk: 0 }),
  config: { pattern: "" },
  positionalArgs: ["pattern", "clk"],  // Order for consuming args (pattern first!)
  expand(config, inputBindings) {
    // Return mono device or poly(devices)
  },
});

// Usage:
seq("c4 e4 g4")             // pattern positional
seq("c4 e4", someClock)     // pattern then clk positional
clock(120).seq("c4 e4 g4")  // clk from chain (defaultInput), pattern positional
chord(261.63, "maj")        // root and chordName positional
seq("c3").cv.chord("maj7")  // chained with config positional
```

## Positional Args Logic

1. If chained (first arg is OutputRef/Descriptor), it goes to defaultInput
2. Remaining args consumed via positionalArgs order
3. When chained, defaultInput is SKIPPED in positionalArgs (already bound)
4. Stop at first plain object (which becomes named params)
5. Trailing object merged as named params

## Test Cases

- `src/ui/test-suite/cases/chord/` - 4 chord tests
- All 171 unit tests pass
