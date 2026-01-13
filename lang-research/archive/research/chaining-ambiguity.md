# Chaining Ambiguity Problem

## The Issue

When a device factory receives a descriptor/OutputRef as its first argument, it can't tell the difference between:

1. **Actual chaining**: `saw(440).gain()` - the saw's output should go to gain's `input`
2. **Positional arg that happens to be a signal**: `gain(lfo(0.5))` - the LFO should go to `level` (first positional arg)

Current code (device.ts lines 305-307) guesses based on type:
```typescript
const isChained = firstArg !== undefined &&
    (isOutputRef(firstArg) || isDescriptor(firstArg) || isPoly(firstArg) || isPolyOutputRef(firstArg));
```

This breaks `gain(lfo(0.5))` because the LFO descriptor triggers `isChained = true`, routing it to `defaultInput` instead of the first positional arg.

## Where Chaining Actually Happens

`chainable-output.ts` - when you access a property on a descriptor that's a device name:

```typescript
// saw(440).gain()
// 1. saw(440) returns descriptor
// 2. .gain accesses property, returns ChainableOutput
// 3. () calls ChainableOutput, which does:
const sourceRef: OutputRef = { descriptorId, outputName: defaultOutput };
return deviceFactory(sourceRef, ...args);  // <-- This is the chain call
```

## The Fix

The factory should only treat it as chained when ChainableOutput explicitly signals it. Options:

1. **Wrapper object**: ChainableOutput passes `{ __chained: true, signal: sourceRef }` instead of raw OutputRef
2. **Separate factory signature**: Register two factories - one for chaining, one for direct calls
3. **Symbol marker**: Add a symbol property to the OutputRef when it's a chain source
4. **Different registry entry**: `registerDevice` stores both `factory` and `chainFactory`

The cleanest is probably option 2 or 4 - ChainableOutput calls a dedicated chain factory that knows the first arg is always the chain source.

## Files Involved

- `src/descriptor/device.ts` - factory creation, isChained detection
- `src/descriptor/proxy/chainable-output.ts` - where chaining actually happens
- `src/descriptor/registry.ts` - device registration

## Current State

- `device("alias", descriptor)` works for simple cases
- Breaks when template has signal bindings: `device("shh", gain(lfo(0.5)))`
- The LFO gets routed to `input` instead of `level`
