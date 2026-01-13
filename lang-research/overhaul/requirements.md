# Requirements

What MUST the system support? Gathered from usage patterns, user expectations, and existing features.

## Definite Requirements

### R1: Poly from arrays
```javascript
saw([220, 330, 440])  // 3-voice oscillator
```
User provides array literal, system creates polyphony.

### R2: Poly from semantics
```javascript
chord(440, "maj")     // 3-voice chord (root, 3rd, 5th)
seq("{c4,e4,g4}")     // 3-voice sequence
```
Config/pattern determines voice count.

### R3: Poly propagation
```javascript
saw([220, 330]).lpf(800).gain(0.5)  // Chain stays poly
```
Downstream devices duplicate to match upstream.

### R4: Stereo distribution
```javascript
saw([220, 330, 440]).spread()  // N voices → L/R stereo
```
Poly collapses to stereo at endpoint.

### R5: Mono modulation of poly
```javascript
saw([220, 330]).lpf(lfo())  // Same LFO to both voices
```
Single modulator broadcasts to all voices.

### R6: Per-voice modulation
```javascript
saw([220, 330]).lpf([800, 1200])  // Different cutoff per voice
```
Array modulator maps to voices.

### R7: Fluent chaining
```javascript
clock(120).seq("c4 e4").saw().lpf(800).out()
```
Devices chain via default input/output.

### R8: Output access
```javascript
let s = seq("c4 e4")
s.cv.saw()    // Pitch output
s.gate.adsr() // Gate output
```
Non-default outputs accessible by name.

## Probable Requirements

### R9: Voice access (unconfirmed)
```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // First voice only
```
Access individual voices for different processing.

**Status:** Not currently supported. Is this needed?

### R10: Dynamic voice count
```javascript
seq(patternVariable)  // Voice count from runtime value
```
Pattern could come from variable, count not known at parse time.

**Status:** Currently supported (expansion deferred). Worth keeping?

## Anti-Requirements (explicitly NOT needed?)

### AR1: Arbitrary reduction
```javascript
saw([220, 330, 440]).reduce(3, 1)  // N→1 arbitrary
```
Only stereo (N→2) reduction via spread/pan. Is N→1 needed?

### AR2: Mid-chain stereo
```javascript
saw(440).spread().lpf(800)  // Stereo mid-chain
```
Currently spread/pan are endpoints. Processing after stereo?

### AR3: Voice count mismatch handling
```javascript
saw([220, 330]).lpf([800, 1200, 1600])  // 2 voices, 3 cutoffs?
```
Currently wraps with modulo. Is this right? Error instead?

## Constraints

### C1: Runtime is scalar
AudioWorklet processes one sample at a time per node.
No SIMD, no array processing at runtime.

### C2: Serialization boundary
Graph must serialize to AudioWorklet.
Functions become strings, WASM becomes bytes.

### C3: Deterministic output
Same code should produce same graph.
Node IDs must be predictable for testing.

## Open Questions

1. Is R9 (voice access) actually required?
2. Is R10 (dynamic voice count) worth the complexity?
3. Should AR1 (N→1 reduction) be supported?
4. What should happen with voice count mismatch (AR3)?
