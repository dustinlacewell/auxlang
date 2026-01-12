# Signal Uniformity

**Signals are signals.** All signal types work in ALL positions.

## Signal Types
- `number` - constant
- `number[]` - array (expands to poly)
- `Descriptor` - device instance
- `OutputRef` - explicit output reference
- `PolyDescriptor` - poly container
- `PolyOutputRef` - poly output reference
- `SignalLambda` - per-sample function

## All Are Valid

```typescript
// As device input (all equivalent ways to modulate saw)
saw(440)
saw(lfo())
saw(lfo.cv)
saw(poly([220, 330]))
saw(polySeq.cv)
saw((s, sr, t) => 200 + t * 50)

// Chaining (all valid)
poly.saw()
polyOutputRef.saw()
descriptor.saw()
outputRef.saw()

// Via setters
saw.freq(anySignal)
```

## If a Signal Type Fails Somewhere, That's a BUG

Never write a test that "expects" a signal type to fail in a position. If it doesn't work, fix the implementation.

## Poly Expansion

Any poly signal as input expands the device:
- `saw(poly)` → poly of saws
- `saw(polyOutputRef)` → poly of saws
- `saw([220, 330])` → poly of saws

## Chaining + Default Input = Error

One exception: explicitly setting the default input when chaining is an error (user confusion):
```typescript
seq.cv.saw({ freq: 880 })  // ERROR: freq already bound from chain
seq.cv.saw({ detune: 5 })  // OK: detune is not the default input
```
