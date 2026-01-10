# Semantic Model: Discrete and Continuous

## Part 1: The Discrete Side

### What does discrete need to express?

From the feature survey, discrete patterns must handle:

| Requirement | Description | Strudel Example |
|-------------|-------------|-----------------|
| Sequence | Events in order within a time span | `a b c` |
| Parallel | Multiple events at same time | `a, b` or stack |
| Subdivision | Divide time into equal parts | `[a b c]` |
| Rest/silence | Absence of event | `~` |
| Repetition | Same event multiple times | `a*4` or `a!4` |
| Speed change | Compress/expand time | `fast`, `slow` |
| Rotation | Shift events in time | `early`, `late`, `iter` |
| Selection | Pick from alternatives | `a|b` random, `<a b>` sequential |
| Euclidean | Distribute n pulses over k steps | `(3,8)` |
| Conditional | Apply transform sometimes | `every`, `when`, `sometimes` |
| Structure | Apply rhythm from one pattern to another | `struct`, `mask` |

### What IS a discrete pattern?

Strudel model: `Pattern a = State -> [Hap a]`
- A function from a time query to a list of events
- Each event (Hap) has: whole span, part span, value
- "Pull-based": you ask for events in a time range

Key properties:
- Patterns are infinite (repeat every cycle by default)
- Time is rational (fractions for precise subdivision)
- Events have duration (whole) not just onset
- Querying is pure (same query = same events, modulo randomness seeds)

### What are the primitive operations?

**Constructors:**
- `pure(v)` - single value, once per cycle
- `silence` - no events
- `fromList([a,b,c])` - sequence of values

**Time operations:**
- `fast(n, pat)` - speed up
- `slow(n, pat)` - slow down
- `early(t, pat)` - shift earlier
- `late(t, pat)` - shift later
- `rev(pat)` - reverse within cycle

**Combinators:**
- `stack([p1, p2])` - parallel (union of events)
- `seq([p1, p2])` - sequential (concatenate in cycle)
- `cat([p1, p2])` - sequential (one per cycle)

**Structure:**
- `struct(boolPat, pat)` - apply rhythm
- `euclid(k, n, pat)` - euclidean distribution

**Higher-order:**
- `every(n, f, pat)` - apply f every n cycles
- `when(boolPat, f, pat)` - apply f when true

---

## Part 2: The Continuous Side

### What does continuous need to express?

| Requirement | Description | Punctual | Kabelsalat |
|-------------|-------------|----------|------------|
| Oscillators | Periodic waveforms | `osc 440` | `sine(440)` |
| LFOs | Low-frequency modulation | `lftri 0.5` | `tri(0.5)` |
| Noise | Random continuous signal | `rnd` | `noise()` |
| Arithmetic | Combine signals | `+`, `*` | `.mul()`, `.add()` |
| Range mapping | Scale to useful ranges | `linlin` | `.range(lo, hi)` |
| Filters | Frequency-dependent | `lpf` | `.lpf(cutoff)` |
| Envelopes | Triggered time-varying shapes | manual | `.adsr(a,d,s,r)` |
| Time reference | Current time as signal | `time` | `time()` |
| Triggers | Discrete impulses | via `seq` | `impulse(freq)` |
| Smoothing | Continuous interpolation | N/A | `.lag()`, `.slew()` |

### What IS a continuous signal?

Punctual model: `Signal` is an AST compiled to GLSL/JS
- Represents a value at every point in time (and space for visuals)
- "Push-based" in execution: computed sample-by-sample

Alternative model (more functional): `Signal a = Time -> a`
- A function from time to value
- Continuous: defined at every instant

Key properties:
- Signals have no inherent duration (infinite)
- Time is real-valued (floats/samples)
- Signals are deterministic (same time = same value)
- Composition is pointwise (operations apply at each instant)

### What are the primitive operations?

**Constructors:**
- `const(v)` - constant value
- `time` - current time in seconds
- `beat` - current time in beats

**Oscillators:**
- `sin(freq)`, `saw(freq)`, `tri(freq)`, `sqr(freq)`

**Math (lifted pointwise):**
- `add(a, b)`, `mul(a, b)`, `sub(a, b)`, `div(a, b)`
- `abs(x)`, `floor(x)`, `sin(x)`, `cos(x)`, etc.

**Range:**
- `range(lo, hi, sig)` - map 0-1 to lo-hi
- `linlin(inLo, inHi, outLo, outHi, sig)` - general mapping

**Filters:**
- `lpf(freq, q, sig)` - lowpass
- `hpf(freq, q, sig)` - highpass

---

## Part 3: The Interaction

### Where do discrete and continuous meet?

| Interaction | Description |
|-------------|-------------|
| Signal → Pattern value | Sample signal at event time to get value |
| Pattern → Signal trigger | Event onset triggers envelope/process |
| Signal → Pattern structure | Signal crossings define event times |
| Shared time | Both reference same tempo/beat clock |

### Interaction Type A: Signal sampled by Pattern

Pattern queries signal at event onset time to get parameter value.

```
Pattern provides: WHEN (event times)
Signal provides: WHAT (values at those times)
```

Use cases:
- LFO modulating filter cutoff per note
- Random value per event
- Gradual parameter drift

### Interaction Type B: Pattern triggers Signal process

Event onset starts a continuous process (envelope, ramp).

```
Pattern provides: TRIGGER (start times)
Signal provides: SHAPE (evolution after trigger)
```

Use cases:
- ADSR envelope per note
- Ramp starting at each event
- Per-note pitch glide

### Interaction Type C: Signal defines Pattern structure

Signal threshold crossings become event onsets.

```
Signal provides: WHEN (via threshold/edge detection)
Pattern provides: WHAT (values for those events)
```

Use cases:
- Trigger events from audio input amplitude
- LFO-driven rhythms
- Generative timing from noise

### Interaction Type D: Shared modulation target

Both discrete and continuous can modulate the same parameter.

```
Final value = base + pattern_offset + signal_modulation
```

Use cases:
- Note pitch (discrete) + vibrato (continuous)
- Velocity (discrete) + expression (continuous)

---

## Part 4: Open Design Questions

1. **Unified or separate types?** Is there one `Flow` type that can be either, or distinct `Pattern` and `Signal` types?

2. **Conversion operators?** Explicit `sample(signal, pattern)` and `trigger(pattern, envelope)`? Or implicit based on context?

3. **Time model?** Do patterns and signals share the same time type? Rational vs float?

4. **Evaluation strategy?** Patterns are pull (query). Signals are push (render). How to reconcile?

5. **Polyphony?** When pattern triggers signal, is it monophonic (retrigger) or polyphonic (new voice)?

6. **Default behavior?** If signal used where pattern expected, auto-sample? Vice versa?
