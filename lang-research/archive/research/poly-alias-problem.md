# Poly Alias Problem

## The Use Case

```javascript
device("shh", gain(lfo([0.2, 0.45]).cv))
saw(440).shh().out()
```

User wants to create a named alias from a poly template, then chain to it.

## What the Template Is

`gain(lfo([0.2, 0.45]).cv)` returns a **poly** with 2 voices:
- Voice 0: gain descriptor with `level` bound to lfo(0.2).cv
- Voice 1: gain descriptor with `level` bound to lfo(0.45).cv

Both voices share the same spec (gain's spec) but have different input bindings.

## What the Alias Should Do

When `saw(440).shh()` is called:
1. ChainableOutput calls the alias factory with `{ input: sawRef }`
2. The factory should return a 2-voice poly where each voice has:
   - Template's `level` binding (the LFO reference)
   - The chained `input` binding (the saw reference)

## Current Problem

`createDeviceAlias` expects a single descriptor to extract `._state` from. A poly doesn't have `._state` - it's just `{ _poly: true, voices: [...] }`.

---

## Ontology: What Exists

### Signal Types
- `number` - constant
- `OutputRef` - `{ descriptorId, outputName }` (references a device output)
- `Descriptor` - has `._state` with `{ id, spec, inputBindings, configBindings }`
- `PolyDescriptor` - `{ _poly: true, voices: Signal[] }`
- `PolyOutputRef` - `{ _polyOutputs: OutputRef[] }`
- `SignalLambda` - per-sample function

### Descriptor State
```typescript
{
  id: string,
  spec: DeviceSpec,
  inputBindings: Record<string, BoundSignal>,
  configBindings: Record<string, ConfigValue>
}
```

### Poly Structure
```typescript
{
  _poly: true,
  voices: Signal[]  // Each voice is any signal type
}
```

A poly's voices are typically descriptors (sharing the same spec), but can be any signal.

### What Operations Exist

1. **Device factory**: `(args) => Descriptor | Poly`
   - Consumes positional args via `positionalArgs` order
   - Merges params objects
   - Creates descriptor via `createDescriptor(spec, inputs, config)`
   - If an input is array/poly/polyOutputRef, expands to poly

2. **Descriptor methods**: `desc.inputName(value)` returns new descriptor with merged binding

3. **Poly proxy methods**: `poly.inputName(value)` maps across voices
   - For device chaining: looks up factory, passes `{ [defaultInput]: voice }` for each
   - For input setters: calls `voice.inputName(resolvedValue)` for each

4. **ChainableOutput**: when you access `desc.outputName.deviceName()`:
   - Looks up factory for deviceName
   - Calls factory with `{ [defaultInput]: outputRef }` as a named param

5. **createDeviceAlias**: for `device("name", existingDescriptor)`
   - Extracts spec + bindings from template
   - Registers factory that merges template bindings with call args
   - Returns factory-wrapped descriptor

---

## The Gap

When template is a poly, `createDeviceAlias` fails because:
- It extracts `templateDescriptor._state.spec` - poly has no `._state`
- It creates a single descriptor - should create a poly

## Why This Should "Just Work"

When you call `saw(440).shh()`:

1. ChainableOutput looks up "shh" factory
2. Calls it with `{ input: sawRef }`
3. Factory should handle this like any device factory

If the factory returned a poly, then:
- The poly proxy would handle further method calls
- `shh().level(0.5)` would map `.level()` across voices

## What the Alias Factory Needs to Do for Poly Templates

```javascript
const factory = (...args) => {
  return poly(templateVoices.map(voice => {
    // Each voice is a descriptor - clone it with merged args
    const voiceState = voice._state;
    const mergedInputs = { ...voiceState.inputBindings, ...argsAsInputs };
    return createDescriptor(voiceState.spec, mergedInputs, voiceState.configBindings);
  }));
}
```

But we can't use `createDescriptor` directly - it's internal to device.ts.

## The Solution (Implemented)

Added `createPolyDeviceAlias` in [device.ts](../src/descriptor/device.ts) that:

1. Gets spec from first descriptor voice (all voices share same spec)
2. Creates a factory that:
   - Parses args once (positional + params objects)
   - Maps across template voices, merging parsed args into each voice's bindings
   - Returns `poly(newVoices)`
3. Returns a proxy that:
   - Is callable (invokes the factory)
   - Passes `isPoly` check (`has` trap for `_poly`)
   - Delegates to template poly for `.voices`, `.out()`, etc.

**Key insight**: A poly alias's spec comes from its first voice's spec (they all share the same spec).
The factory parses args against that spec, then distributes to each voice.
