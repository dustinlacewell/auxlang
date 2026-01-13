# Comprehensive Trace: Does VoiceRef Work Through All Phases?

## Test Case

A single example that exercises:
- Array polyphony (`saw([...])`)
- Semantic expansion (`chord`, `seq`)
- Voice access (`.voices[0]`)
- Stereo transform (`spread`, `pan`)
- Mixed voice counts
- Chaining

```javascript
clock(120).apply(c => {
  // Poly from seq pattern (3 voices)
  let s = seq("{c3, e3, g3}").clk(c)

  // Voice access: different waveshape per voice
  let v0 = s.voices[0].saw()
  let v1 = s.voices[1].tri()
  let v2 = s.voices[2].sin()

  // Each voice gets envelope from its own gate
  let e0 = v0.gain(s.voices[0].gate.ad())
  let e1 = v1.gain(s.voices[1].gate.ad())
  let e2 = v2.gain(s.voices[2].gate.ad())

  // Combine back to poly and spread
  poly([e0, e1, e2]).spread().out()
})
```

## Phase 1: API Time

### What gets created?

```
clock1: { device: "clock", inputs: { bpm: 120 } }

seq2: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "{c3,e3,g3}" } }

// Voice access creates VoiceRefs
VoiceRef(seq2, 0)  →  saw3: { device: "saw", inputs: { freq: VoiceRef(seq2, 0, "cv") } }
VoiceRef(seq2, 1)  →  tri4: { device: "tri", inputs: { freq: VoiceRef(seq2, 1, "cv") } }
VoiceRef(seq2, 2)  →  sin5: { device: "sin", inputs: { freq: VoiceRef(seq2, 2, "cv") } }

// Gate access creates VoiceRefs with output specified
ad6: { device: "ad", inputs: { gate: VoiceRef(seq2, 0, "gate") } }
ad7: { device: "ad", inputs: { gate: VoiceRef(seq2, 1, "gate") } }
ad8: { device: "ad", inputs: { gate: VoiceRef(seq2, 2, "gate") } }

gain9: { device: "gain", inputs: { input: OutputRef(saw3), level: OutputRef(ad6) } }
gain10: { device: "gain", inputs: { input: OutputRef(tri4), level: OutputRef(ad7) } }
gain11: { device: "gain", inputs: { input: OutputRef(sin5), level: OutputRef(ad8) } }

// poly([...]) creates what?
// Option A: Single node with array input
// Option B: Just collects refs for spread to consume

spread12: { device: "spread", inputs: { input: [OutputRef(gain9), OutputRef(gain10), OutputRef(gain11)] } }

out13: { device: "out", inputs: { input: OutputRef(spread12) } }
```

### Key Question: What is VoiceRef exactly?

```typescript
interface VoiceRef {
  source: NodeId;  // "seq2"
  index: number;   // 0, 1, or 2
  output?: string; // "cv" or "gate"
}
```

It's stored in node inputs just like OutputRef.

## Phase 2: Expansion

### Step 1: Topological sort

Order: clock1, seq2, saw3, tri4, sin5, ad6, ad7, ad8, gain9, gain10, gain11, spread12, out13

### Step 2: Process clock1

No poly, no expand. Stays as-is.
```
nodeMap: { clock1: ["clock1"] }
```

### Step 3: Process seq2

seq has `expand()` for pattern "{c3,e3,g3}".
expand() creates 3 mono seqs:

```
seq2.0: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "c3" } }
seq2.1: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "e3" } }
seq2.2: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "g3" } }
```

```
nodeMap: { clock1: ["clock1"], seq2: ["seq2.0", "seq2.1", "seq2.2"] }
```

### Step 4: Process saw3

saw3 has input: `VoiceRef(seq2, 0, "cv")`

**Resolve VoiceRef:**
1. Look up seq2 in nodeMap → ["seq2.0", "seq2.1", "seq2.2"]
2. Pick index 0 → "seq2.0"
3. Create OutputRef: { ref: "seq2.0", out: "cv" }

saw3 becomes:
```
saw3: { device: "saw", inputs: { freq: OutputRef(seq2.0, "cv") } }
```

No poly upstream (it's a single voice ref), so no duplication.
```
nodeMap: { ..., saw3: ["saw3"] }
```

### Step 5: Process tri4, sin5

Same pattern:
- tri4 gets `{ freq: OutputRef(seq2.1, "cv") }`
- sin5 gets `{ freq: OutputRef(seq2.2, "cv") }`

### Step 6: Process ad6, ad7, ad8

- ad6 gets `{ gate: OutputRef(seq2.0, "gate") }`
- ad7 gets `{ gate: OutputRef(seq2.1, "gate") }`
- ad8 gets `{ gate: OutputRef(seq2.2, "gate") }`

### Step 7: Process gain9, gain10, gain11

No VoiceRefs here, just regular OutputRefs. No poly expansion.

### Step 8: Process spread12

spread has `polyphonic: true` and `expand()`.

Input is array: `[OutputRef(gain9), OutputRef(gain10), OutputRef(gain11)]`

spread.expand() receives this array, creates L/R mixers:
```
_leftMixer: inputs v0=gain9, v1=gain10, v2=gain11
_rightMixer: inputs v0=gain9, v1=gain10, v2=gain11
```

Returns [leftMixer, rightMixer].

```
nodeMap: { ..., spread12: ["_leftMixer", "_rightMixer"] }
```

### Step 9: Process out13

out has input: `OutputRef(spread12)`

Resolve via nodeMap: spread12 → ["_leftMixer", "_rightMixer"]

This is poly (2 outputs), so out gets duplicated:
```
out13.0: { input: OutputRef(_leftMixer) }
out13.1: { input: OutputRef(_rightMixer) }
```

Stereo distribution:
- out13.0 → Left
- out13.1 → Right

## Final Graph

```
clock1
  ↓
seq2.0 (c3) ──→ saw3 ──→ gain9 ──┐
seq2.1 (e3) ──→ tri4 ──→ gain10 ─┼──→ _leftMixer ──→ out13.0 (L)
seq2.2 (g3) ──→ sin5 ──→ gain11 ─┘         │
                                           └──→ _rightMixer ──→ out13.1 (R)
        ↓           ↓           ↓
       ad6         ad7         ad8
      (gates from each seq voice)
```

## Does It Work?

### VoiceRef Resolution ✓
- `s.voices[0].cv` becomes `VoiceRef(seq2, 0, "cv")`
- At expansion, resolves to `OutputRef(seq2.0, "cv")`

### Different Processing Per Voice ✓
- v0 → saw, v1 → tri, v2 → sin
- Each is a separate descriptor/node

### Gate Access Per Voice ✓
- `s.voices[0].gate` becomes `VoiceRef(seq2, 0, "gate")`
- Resolves correctly to seq2.0's gate output

### Spread Consumption ✓
- Receives array of 3 OutputRefs
- Creates L/R mixers referencing all 3

### Stereo Output ✓
- out duplicated to match spread's 2 outputs
- Distributed to L/R channels

## Edge Cases to Check

### EC1: VoiceRef to non-poly source?

```javascript
let mono = saw(440)
mono.voices[0]  // ???
```

Options:
A) Error: saw(440) is not poly
B) Works: voices[0] of a mono source is just the source itself

**Recommendation:** Option B is more permissive and makes generic code easier.

### EC2: VoiceRef index out of range?

```javascript
seq("{c3,e3}").voices[5]  // Only 2 voices
```

At expansion: seq2 expands to ["seq2.0", "seq2.1"]. Index 5 → error or wrap?

**Recommendation:** Error. User explicitly asked for voice 5.

### EC3: Chaining on poly after voice access?

```javascript
let s = seq("{c3,e3,g3}")
s.voices[0].saw().lpf(800)  // Works, returns mono descriptor

s.saw().lpf(800)  // What does this mean?
```

If `s` is a poly descriptor, `s.saw()` should:
A) Error: ambiguous
B) Return poly saw (3 saws)

Current behavior is B (chaining broadcasts). Keep it.

### EC4: poly() function

```javascript
poly([e0, e1, e2])
```

What does this return? Options:
A) PolyDescriptor that wraps the array
B) Just passes array through to next device

For spread, it just needs to receive an array. Could be either.

**Recommendation:** poly() returns a lightweight wrapper that spread recognizes.

## Conclusion

The VoiceRef model traces through cleanly:
1. API time: VoiceRef stored as symbolic `(source, index, output)`
2. Expansion: VoiceRef resolved to OutputRef after source expands
3. All voice-specific routing works
4. spread/pan receive arrays and create stereo

**No blocking issues found.** The model works for this comprehensive case.
