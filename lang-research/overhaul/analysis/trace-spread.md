# Trace: Spread's Needs

Spread takes N voices and outputs stereo (2 outputs).

## Test Case 1: Basic spread

```javascript
saw([220, 330, 440]).spread().out()
```

### Phase 1: API Time

```
saw1: { device: "saw", inputs: { freq: [220, 330, 440] } }
spread2: { device: "spread", inputs: { input: OutputRef(saw1) } }
out3: { device: "out", inputs: { input: OutputRef(spread2) } }
```

### Phase 2: Expansion

**Process saw1:**
Array → 3 nodes
```
saw1.0, saw1.1, saw1.2
nodeMap: { saw1: ["saw1.0", "saw1.1", "saw1.2"] }
```

**Process spread2:**
- `polyphonic: true` → don't duplicate
- Input OutputRef(saw1) → resolves to array [saw1.0, saw1.1, saw1.2]
- Call spread.expand(config, { input: [ref0, ref1, ref2], width: 1 })

**Inside spread.expand():**
```typescript
const voices = inputBindings.input;  // array of 3 OutputRefs
const n = voices.length;  // 3

const leftMixer = createMixer(3, true);   // anonymous device
const rightMixer = createMixer(3, false); // anonymous device

const mixerInputs = { width: 1, v0: voices[0], v1: voices[1], v2: voices[2] };

const leftNode = leftMixer(mixerInputs);
const rightNode = rightMixer(mixerInputs);

return [leftNode, rightNode];
```

**Key:** leftMixer and rightMixer directly reference the voice OutputRefs.
No intermediate sumNode. No internal node problem!

```
nodeMap: { ..., spread2: ["_anon1", "_anon2"] }
```

**Process out3:**
- Input OutputRef(spread2) → ["_anon1", "_anon2"]
- Poly count 2 → duplicate out twice

```
out3.0 → _anon1 → Left
out3.1 → _anon2 → Right
```

### Result

Works correctly. Spread doesn't have the internal node bug because it doesn't create intermediate nodes.

## Test Case 2: Spread with width modulation

```javascript
saw([220, 330, 440]).spread({ width: sin(0.2) }).out()
```

### Phase 1: API Time

```
sin1: { device: "sin", inputs: { freq: 0.2 } }
saw2: { device: "saw", inputs: { freq: [220, 330, 440] } }
spread3: { device: "spread", inputs: { input: OutputRef(saw2), width: OutputRef(sin1) } }
out4: { device: "out", inputs: { input: OutputRef(spread3) } }
```

### Phase 2: Expansion

**Process sin1:** Mono, no change.

**Process saw2:** 3 voices.

**Process spread3:**
- width is OutputRef(sin1) - mono modulator
- input is array of 3 voice refs
- expand() receives: { input: [3 refs], width: OutputRef(sin1) }

**Inside spread.expand():**
```typescript
const mixerInputs = {
  width: inputBindings.width,  // OutputRef(sin1) - same for both mixers
  v0: voices[0],
  v1: voices[1],
  v2: voices[2]
};

const leftNode = leftMixer(mixerInputs);
const rightNode = rightMixer(mixerInputs);
```

Both L/R mixers receive the same width modulator. ✓

## Test Case 3: Spread after voice access

```javascript
let c = chord(440, "maj")
poly([c.voices[0].saw(), c.voices[1].tri(), c.voices[2].sin()]).spread().out()
```

### Phase 1: API Time

```
chord1: { device: "chord", config: { root: 440, type: "maj" } }

// VoiceRefs
saw2: { input: VoiceRef(chord1, 0, "cv") }
tri3: { input: VoiceRef(chord1, 1, "cv") }
sin4: { input: VoiceRef(chord1, 2, "cv") }

// poly() collects them
spread5: { input: [OutputRef(saw2), OutputRef(tri3), OutputRef(sin4)] }

out6: { input: OutputRef(spread5) }
```

### Phase 2: Expansion

**Process chord1:**
expand() creates 3 chordTone nodes
```
chord1.0, chord1.1, chord1.2 (root, 3rd, 5th)
nodeMap: { chord1: ["chord1.0", "chord1.1", "chord1.2"] }
```

**Process saw2:**
- Input is VoiceRef(chord1, 0, "cv")
- Resolve: chord1 → ["chord1.0", ...], pick index 0 → chord1.0
- Becomes: { input: OutputRef(chord1.0, "cv") }
- Mono, no duplication

**Process tri3, sin4:** Same pattern with indices 1, 2.

**Process spread5:**
- Input is array [OutputRef(saw2), OutputRef(tri3), OutputRef(sin4)]
- These are now mono refs (each VoiceRef resolved to single node)
- spread.expand() creates L/R mixers

**Process out6:** Stereo distribution.

### Result

VoiceRef + poly() + spread all work together. ✓

## Test Case 4: What if spread receives mono?

```javascript
saw(440).spread().out()
```

### Phase 1

```
saw1: { freq: 440 }  // mono
spread2: { input: OutputRef(saw1) }
out3: { input: OutputRef(spread2) }
```

### Phase 2

**Process saw1:** Mono, no change.

**Process spread2:**
- Input OutputRef(saw1) → nodeMap has ["saw1"] (1 element)
- Input resolved as mono, not array

**Inside spread.expand():**
```typescript
const input = inputBindings.input;
const voices = isOutputRefArray(input) ? input : [input];  // Normalize to array
const n = voices.length;  // 1

// Creates 2 mixers with 1 voice each
// Effectively: L and R both get the same mono signal
```

Mono spread = center pan. Makes sense. ✓

## Spread-Specific Questions

### Q1: Can spread receive different voice counts on different runs?

Yes. expand() runs at expansion time. Voice count determined by actual input array length.

Dynamic voice count works because spread doesn't need to know count at API time.

### Q2: What if spread receives 0 voices?

```javascript
poly([]).spread()  // Empty array
```

expand() receives empty array. Could:
A) Error: no voices to spread
B) Output silence

**Recommendation:** Error. Spreading nothing is probably a bug.

### Q3: What's the output of spread?

Stereo (2 nodes). Not "poly 2" but specifically L/R.

When out receives spread's output:
- out3.0 → Left channel
- out3.1 → Right channel

The round-robin distribution naturally puts them L/R.

## Conclusion

Spread works:
1. Receives poly input as array ✓
2. Creates L/R mixers ✓
3. No internal node bug (direct voice references) ✓
4. Width modulation shared across mixers ✓
5. Works with VoiceRef inputs ✓
6. Mono fallback works ✓
