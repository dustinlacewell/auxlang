# Theory: Hybrid Expansion (Eager Unfold, Deferred Transform)

## The Model

Two categories of poly-creating operations:

### Unfold (API time)
Devices that create voices from config/input:
- `saw([220, 330])` → 2 saw descriptors
- `chord(440, "maj")` → 3 chordTone descriptors
- `seq("{c4,e4,g4}")` → 3 seq descriptors

These expand IMMEDIATELY when called.

### Transform (Build time)
Devices that consume poly and produce stereo:
- `spread(poly)` → L/R
- `pan(poly)` → L/R

These expand DURING build (need to know voice count from upstream).

## How Unfold Works

### Array inputs
```typescript
function saw(freq) {
  if (Array.isArray(freq)) {
    return poly(freq.map(f => saw(f)));  // Recursive, scalar calls
  }
  return createDescriptor("saw", { freq });
}
```

### Semantic expansion
```typescript
function chord(root, type) {
  const intervals = getIntervals(type);  // [0, 4, 7] for major
  return poly(intervals.map(i => chordTone({ root, interval: i })));
}
```

### Pattern expansion
```typescript
function seq(pattern) {
  const parsed = parsePattern(pattern);
  if (parsed.voices > 1) {
    return poly(parsed.voicePatterns.map(p => seq(p)));
  }
  return createDescriptor("seq", { pattern: parsed.monoPattern });
}
```

## The PolyDescriptor Type

```typescript
interface PolyDescriptor {
  voices: Descriptor[];

  // Chaining broadcasts to all voices
  lpf(cutoff): PolyDescriptor;
  gain(level): PolyDescriptor;

  // Output access returns PolyOutputRef
  cv: PolyOutputRef;
  gate: PolyOutputRef;

  // Stereo endpoints
  spread(width?): StereoDescriptor;
  pan(position?): StereoDescriptor;

  // Terminal
  out(): void;
}
```

## Chaining Behavior

### Mono device on poly
```javascript
poly.lpf(800)  // Maps: poly.voices.map(v => v.lpf(800))
```
Returns new PolyDescriptor with filtered voices.

### Array input on poly
```javascript
poly.lpf([800, 1200])  // Zips: voices[i].lpf(cutoffs[i % len])
```

### Mono modulator on poly
```javascript
let mod = lfo()
poly.lpf(mod)  // All voices get same mod ref
```

### Poly on poly
```javascript
let cutoffs = lfo([1, 2])  // 2 lfos
poly3.lpf(cutoffs)  // 3 voices, 2 cutoffs - wrap or error?
```

## Input Setting After Unfold

```javascript
let s = seq("{c4,e4,g4}")  // Already unfolded to 3 seqs
s.clk(clock(120))          // Must set on all 3
```

### Implementation
```typescript
class PolyDescriptor {
  clk(c) {
    return poly(this.voices.map(v => v.clk(c)));
  }
}
```

Each setter returns NEW PolyDescriptor with updated voices.
Immutable, functional style.

## How Transform Works

At build time, when we encounter spread/pan:

```typescript
// During graph building
function processSpread(poly: PolyDescriptor, width) {
  const n = poly.voices.length;  // NOW we know voice count
  const leftMixer = createMixer(n, "left", width);
  const rightMixer = createMixer(n, "right", width);

  // Connect each voice to both mixers
  for (let i = 0; i < n; i++) {
    leftMixer.connect(poly.voices[i], gainForLeft(i, n, width));
    rightMixer.connect(poly.voices[i], gainForRight(i, n, width));
  }

  return stereo(leftMixer, rightMixer);
}
```

## Testing Against Requirements

### R1: Poly from arrays ✓
```javascript
saw([220, 330])  // Immediate unfold
```

### R2: Poly from semantics ✓
```javascript
chord(440, "maj")  // Immediate unfold
```

### R3: Poly propagation ✓
```javascript
poly.lpf(800)  // Maps over voices
```

### R4: Stereo distribution ✓
```javascript
poly.spread()  // Transform at build time
```

### R5: Mono modulation ✓
```javascript
poly.lpf(lfo())  // Same ref to all voices
```

### R6: Per-voice modulation ✓
```javascript
poly.lpf([800, 1200])  // Zipped
```

### R7: Fluent chaining ✓
```javascript
clock(120).seq("c4 e4").saw().lpf(800).out()
```

### R8: Output access ✓
```javascript
s.cv  // PolyOutputRef
s.cv.saw()  // Maps
```

### R9: Voice access ✓
```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Works!
c.voices[1].tri()
```

## Potential Issues

### Issue 1: What is `poly.out()`?

Does it:
A) Create N out nodes? (round-robin stereo)
B) Error - must use spread()/pan() first?
C) Implicitly call spread()?

**Recommendation:** Option A for convenience, but encourage spread/pan.

### Issue 2: Descriptor vs PolyDescriptor confusion

```javascript
let x = saw(440)        // Descriptor
let y = saw([440, 550]) // PolyDescriptor

x.lpf(800)  // Returns Descriptor
y.lpf(800)  // Returns PolyDescriptor
```

Type changes based on input. Is this confusing?

**Mitigation:** Clear type names, good error messages.

### Issue 3: Nested poly

```javascript
let p1 = saw([220, 330])       // 2 voices
let p2 = saw([440, 550, 660])  // 3 voices
mix({ a: p1, b: p2 })          // ???
```

What happens? Options:
A) Error - can't mix different poly counts
B) Expand to max (3), wrap shorter
C) mix becomes poly(3) with wrapped inputs

**Current behavior is B.** Keep it?

### Issue 4: Dynamic patterns

```javascript
let pattern = getPattern()  // Runtime value
seq(pattern)                // Can we unfold?
```

If pattern is a string, we can parse it to get voice count.
If pattern is computed, maybe not.

**Mitigation:** Always parse strings at call time.

## Conclusion

Hybrid model works. Main challenge is type management (Descriptor vs PolyDescriptor).

The model cleanly separates:
- **Unfold:** User-facing poly creation (immediate)
- **Transform:** Stereo distribution (deferred)
- **Pass-through:** Chaining (maps over voices)

This matches how users think:
- "I'm creating 3 voices" (unfold)
- "I'm spreading them to stereo" (transform)
- "I'm filtering them" (pass-through)
