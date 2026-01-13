# Trace: Seq's Unique Needs

Seq has multiple outputs (cv, gate, trig) and pattern-based expansion.

## Test Case 1: Basic poly seq

```javascript
clock(120).seq("{c4, e4, g4}").apply(s =>
  s.saw().gain(s.gate.ad()).out()
)
```

### Phase 1: API Time

```
clock1: { device: "clock", inputs: { bpm: 120 } }
seq2: { device: "seq", inputs: { clk: OutputRef(clock1) }, config: { pattern: "{c4,e4,g4}" } }
saw3: { device: "saw", inputs: { freq: OutputRef(seq2, "cv") } }
ad4: { device: "ad", inputs: { gate: OutputRef(seq2, "gate") } }
gain5: { device: "gain", inputs: { input: OutputRef(saw3), level: OutputRef(ad4) } }
out6: { device: "out", inputs: { input: OutputRef(gain5) } }
```

Note: `s.saw()` creates saw with input = `OutputRef(seq2, "cv")` (default output).
`s.gate` creates `OutputRef(seq2, "gate")`.

### Phase 2: Expansion

**Process clock1:** No change.

**Process seq2:**
- seq has expand() for pattern "{c4,e4,g4}"
- Pattern has 3 voices → expand creates 3 mono seqs

```
seq2.0: { config: { pattern: "c4" }, inputs: { clk: OutputRef(clock1) } }
seq2.1: { config: { pattern: "e4" }, inputs: { clk: OutputRef(clock1) } }
seq2.2: { config: { pattern: "g4" }, inputs: { clk: OutputRef(clock1) } }

nodeMap: { clock1: ["clock1"], seq2: ["seq2.0", "seq2.1", "seq2.2"] }
```

**Process saw3:**
- Input is OutputRef(seq2, "cv")
- Resolve: seq2 → ["seq2.0", "seq2.1", "seq2.2"]
- **Input becomes array:** [OutputRef(seq2.0, "cv"), OutputRef(seq2.1, "cv"), OutputRef(seq2.2, "cv")]
- saw is NOT polyphonic → duplicate 3 times

```
saw3.0: { freq: OutputRef(seq2.0, "cv") }
saw3.1: { freq: OutputRef(seq2.1, "cv") }
saw3.2: { freq: OutputRef(seq2.2, "cv") }

nodeMap: { ..., saw3: ["saw3.0", "saw3.1", "saw3.2"] }
```

**Process ad4:**
- Input is OutputRef(seq2, "gate")
- Same expansion: seq2 → 3 nodes
- ad duplicated 3 times

```
ad4.0: { gate: OutputRef(seq2.0, "gate") }
ad4.1: { gate: OutputRef(seq2.1, "gate") }
ad4.2: { gate: OutputRef(seq2.2, "gate") }
```

**Process gain5:**
- Input is OutputRef(saw3) → ["saw3.0", "saw3.1", "saw3.2"]
- Level is OutputRef(ad4) → ["ad4.0", "ad4.1", "ad4.2"]
- Both poly count 3 → duplicate 3 times, zip inputs

```
gain5.0: { input: OutputRef(saw3.0), level: OutputRef(ad4.0) }
gain5.1: { input: OutputRef(saw3.1), level: OutputRef(ad4.1) }
gain5.2: { input: OutputRef(saw3.2), level: OutputRef(ad4.2) }
```

**Process out6:**
- Input is OutputRef(gain5) → 3 nodes
- out duplicated 3 times

```
out6.0 → gain5.0 → Left
out6.1 → gain5.1 → Right
out6.2 → gain5.2 → Left
```

### Result

Three independent voice chains, stereo distributed. ✓

## Test Case 2: Voice access on seq

```javascript
let s = seq("{c4, e4}")
s.voices[0].saw()
s.voices[1].tri()
```

### With VoiceRef

```
seq1: { device: "seq", config: { pattern: "{c4,e4}" } }
saw2: { device: "saw", inputs: { freq: VoiceRef(seq1, 0, "cv") } }
tri3: { device: "tri", inputs: { freq: VoiceRef(seq1, 1, "cv") } }
```

### At Expansion

seq1 expands to [seq1.0, seq1.1]

VoiceRef(seq1, 0, "cv") → OutputRef(seq1.0, "cv")
VoiceRef(seq1, 1, "cv") → OutputRef(seq1.1, "cv")

saw2 and tri3 each get their respective seq voice. ✓

## Test Case 3: Accessing both cv and gate from same voice

```javascript
let s = seq("{c4, e4}")
s.voices[0].cv.saw().gain(s.voices[0].gate.ad())
```

### With VoiceRef

```
seq1: { ... }
saw2: { freq: VoiceRef(seq1, 0, "cv") }
ad3: { gate: VoiceRef(seq1, 0, "gate") }
gain4: { input: OutputRef(saw2), level: OutputRef(ad3) }
```

### At Expansion

Both VoiceRefs resolve to seq1.0:
- VoiceRef(seq1, 0, "cv") → OutputRef(seq1.0, "cv")
- VoiceRef(seq1, 0, "gate") → OutputRef(seq1.0, "gate")

saw2 gets pitch from seq1.0
ad3 gets gate from seq1.0
gain4 combines them

**Same voice's outputs correctly associated.** ✓

## Test Case 4: Mixed - some voices explicit, some chained

```javascript
let s = seq("{c4, e4, g4}")
let v0 = s.voices[0].saw()
let rest = s.saw()  // Applies to all voices?
```

What does `s.saw()` mean when s is a poly seq?

### Option A: s.saw() = poly saw (current behavior)

`s.saw()` chains from seq's default output (cv), creating saw with input = OutputRef(seq).

At expansion, OutputRef(seq) becomes array, saw gets duplicated 3 times.

So `rest` = 3 saws.

But `v0` = 1 saw (from VoiceRef).

User now has:
- v0: 1 saw (voice 0)
- rest: 3 saws (all voices including voice 0 again)

Is this confusing? Voice 0 processed twice if both used.

### Option B: s.saw() errors if voices already accessed

Too restrictive. User might want both.

### Option C: Document the behavior

s.voices[N] gives VoiceRef to one voice.
s.saw() gives poly saw from all voices.
Both can coexist, user chooses which to use.

**Recommendation:** Option C. It's flexible and explicit.

## Seq-Specific Questions

### Q1: What if pattern has different beat counts per voice?

```javascript
seq("{c4 d4, e4}")  // Voice 0 has 2 beats, voice 1 has 1 beat
```

Each mono seq gets its own pattern:
- seq.0: "c4 d4" (2 beats)
- seq.1: "e4" (1 beat)

They run independently with different loop lengths. That's correct behavior.

### Q2: What if clk is set after pattern?

```javascript
let s = seq("{c4, e4}")
s.clk(clock(120))  // Must apply to all expanded seqs
```

With current deferred model:
- seq node created with pattern config
- .clk() returns new descriptor with clk input set
- At expansion, all 2 seqs get the clk

Works. ✓

### Q3: What about seq without voices (mono pattern)?

```javascript
seq("c4 d4 e4")  // No {}, mono pattern
```

expand() detects mono pattern, returns single seq (or no expand needed).

No VoiceRef issues. Works. ✓

## Conclusion

Seq's needs are satisfied:
1. Pattern-based expansion via expand() ✓
2. Multiple outputs (cv, gate, trig) accessible ✓
3. VoiceRef can specify which voice AND which output ✓
4. Chaining (s.saw()) works for full poly ✓
5. Voice access (s.voices[0]) works for single voice ✓
