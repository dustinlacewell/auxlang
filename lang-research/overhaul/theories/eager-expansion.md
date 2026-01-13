# Theory: Eager Expansion

## The Idea

Expand poly at API time, not during build.

```javascript
saw([220, 330])  // Immediately: [saw(220), saw(330)]
chord(440, "maj")  // Immediately: [chordTone(440), chordTone(554), chordTone(659)]
```

## How It Would Work

### Device returns PolyDescriptor

```typescript
function saw(freq) {
  if (Array.isArray(freq)) {
    return poly(freq.map(f => saw(f)));
  }
  return createDescriptor("saw", { freq });
}
```

### PolyDescriptor has .voices

```typescript
interface PolyDescriptor {
  voices: Descriptor[];
  // ... chaining methods that map over voices
}
```

### Chaining broadcasts

```javascript
let p = saw([220, 330])  // PolyDescriptor with 2 voices
p.lpf(800)  // Returns PolyDescriptor: [voices[0].lpf(800), voices[1].lpf(800)]
```

## Testing Against Requirements

### R1: Poly from arrays ✓
```javascript
saw([220, 330])  // Works, creates PolyDescriptor immediately
```

### R2: Poly from semantics ✓
```javascript
chord(440, "maj")  // chord() returns PolyDescriptor
```

### R3: Poly propagation ✓
```javascript
saw([220, 330]).lpf(800)  // Chaining maps over voices
```

### R4: Stereo distribution ✓
```javascript
poly.spread()  // spread receives PolyDescriptor, knows voice count
```

### R5: Mono modulation ✓
```javascript
saw([220, 330]).lpf(lfo())  // Each voice gets same lfo ref
```

### R6: Per-voice modulation ✓
```javascript
saw([220, 330]).lpf([800, 1200])  // Zip arrays
```

### R7: Fluent chaining ✓
```javascript
clock(120).seq("c4 e4").saw().lpf(800).out()  // Works
```

### R8: Output access ✓
```javascript
let s = seq("c4 e4")  // PolyDescriptor
s.cv  // PolyOutputRef (array of output refs)
s.cv.saw()  // Maps over outputs
```

### R9: Voice access ✓ (NEW CAPABILITY)
```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Works! voices exist at API time
```

## The Problem: Setting Inputs After Expansion

```javascript
let s = seq("{c4,e4,g4}")  // 3 seqs created immediately
s.clk(clock(120))  // Must set clk on all 3
```

### Option A: Broadcast setters

```javascript
// PolyDescriptor.clk() maps over voices
s.clk(c) → poly([s.voices[0].clk(c), s.voices[1].clk(c), ...])
```

This works! Setters return new PolyDescriptor.

### Option B: Voices must share inputs

What if `clk` HAD to be set before expansion?

```javascript
seq("{c4,e4,g4}").clk(clock(120))
// clk set first, THEN pattern parsed, THEN expansion
```

Order matters. Could be confusing.

## The Problem: Dynamic Voice Count

```javascript
let pattern = getPatternFromUser()  // "{c4,e4}" or "{c4,e4,g4}"?
seq(pattern)  // Voice count unknown at API time
```

### Option A: Disallow dynamic patterns

Patterns must be literals. `seq("{c4,e4}")` works, `seq(variable)` errors.

### Option B: Lazy expansion for dynamic

If pattern is variable, defer expansion. Only literals expand eagerly.

### Option C: Pattern is always parsed

Even if pattern comes from variable, parse it to determine voice count:
```javascript
let pattern = "{c4,e4,g4}"
seq(pattern)  // Parse pattern at API time, extract voice count
```

This works for string patterns. What about computed patterns?

## Evaluation

### Pros
- Voice access works (R9 satisfied)
- Simpler mental model
- No separate expansion pass for user-created poly
- spread/pan know voice count immediately

### Cons
- Input setting must broadcast
- Dynamic patterns need special handling
- More objects created at API time

### Verdict

**Promising.** The main challenge is input broadcasting, but Option A handles it.

Dynamic patterns (Option C) can work if pattern is always a parseable string.

## Next Steps

1. Prototype PolyDescriptor
2. Test input broadcasting
3. Decide on dynamic pattern handling
