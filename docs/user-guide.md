# Auxlang User Guide (core3)

A systematic guide to writing patches in core3.

---

## 1. Fundamentals

A patch is a JavaScript expression. Evaluating it builds pure values that describe a signal graph; nothing sounds. The only effect is `out()`: a value reaches audio precisely when it flows into `out()`. Everything else is construction.

A chain reads left-to-right: source → processors → out.

```js
tri(57)
  .lpf({ cutoff: 86, res: 0.2 })
  .gain(0.3)
  .out()
```

A triangle oscillator at semitone 57 (220 Hz) feeds a low-pass filter, then an amplitude scale, then output. Read top to bottom, it is the whole strategy: what the sound is, what shapes it, that it plays.

---

## 2. Modules

Modules are pure state machines with named inputs and outputs. Each has a default input (the target when a chain flows into it) and a default output (what a chain reads from it next). You make one by calling a factory. Three ways to fill its ports:

- Positional args fill declared ports in their declared order.
- An object arg names ports explicitly.
- Method setters copy-with-change: `x.lpf({ cutoff: 67 })` returns a new value.

The module families:

### Sources

- `sin` / `saw` / `tri` / `sqr` — oscillators. Positional signature is `[pitch, min, max]`, where pitch is in MIDI semitones and defaults to 69 (A4): `sin(69)` and `sin()` both mean A440. `fm` adds Hz straight to the frequency from `pitch` (linear FM). For an exact Hz value, tag it: `sin(hz(440))`. There is an output range (`min`/`max`).
- `lfo` — Hz-rate LFO, the device for modulation. Positional signature is `[freq, min, max]` in Hz: `lfo(0.3, 100, 800)` sweeps 100–800 at 0.3 Hz. Defaults to freq 1, min -1, max 1. Shape is config — `lfo({ shape: "tri" })` — sin (default), saw, tri, or sqr.
- `fm(pitch, index, ratio)` — a 2-operator FM voice. `pitch` is semitones; no `freq` port.
- `noise` — noise source.

### Filters

- `lpf` / `hpf` / `bpf` / `notch` — `{ cutoff, res }`, positional `[cutoff, res]`. `cutoff` is in semitones (69 = 440 Hz), same numbering as pitch.

### Envelopes (gate-driven)

- `ad(attack, decay)`
- `ar(attack, release)`
- `adsr(attack, decay, sustain, release)`

### Amplitude and math

- `mul` (aliases `gain`, `vca`), `add`, `sub`, `div`, `wrap` (modulo — arithmetic remainder), `abs`, `clip`, `scale`, `slew`, `sah`, `quantize`.

### Comparators

- `gt`, `lt`, `eq` — emit `0`/`1` gates.

### Effects

- `delay({ time, feedback, mix, tone })` — `time` in seconds. `tone` (0..1, default 1 = open) darkens each repeat with a lowpass in the feedback path.
- `pan({ pos })` — constant-power pan, outputs `l` and `r`.
- `spread(amount)` — places lane k of n evenly across `[-amount, amount]`, outputs `l` and `r`.
- `period(pitch)` — seconds per cycle of a pitch in semitones; feed it to `delay`'s `time` to tune an echo or a Karplus-Strong string to a note.

### Timing and bridge

- `tempo(bpm)` sets the ambient clock. `clock(bpm)` makes an extra clock with outputs `out` (position in bars), `beat` and `bar` (triggers).
- `seq(pattern, position)` reads a pattern at a position. With no position it reads the ambient clock. A pattern handed to a knob becomes a `seq` automatically.
- `counter(trig, { reset, length })` counts triggers into a step position, one step per trigger.
- `clockdiv(trig, by, { reset })` passes the first trigger and every `by`-th after it. `clockmult(trig, by)` fires `by` evenly spaced triggers per input period; it locks after two input triggers.

### Drums (trigger-driven, default input `trig`)

- `kick`, `snare`, `hihat`, `clap`.

### Reducer and output

- `mix`, `out`.

### Units

Each port has a native unit: pitch and cutoff are semitones (69 = 440 Hz); `fm` and `lfo` rate are Hz; delay and envelope times are seconds. A unit tag — `hz(x)`, `semis(x)`, `secs(x)`, `beats(x)` — says what unit a number or signal is in; the port it's wired to converts. Tagging a value in a unit the port can't convert from is an error.

---

## 3. Chaining

`.method()` continues the chain from the previous value's default output. `s.tri()` chains a triangle from `s`'s default output.

**Signal-uniformity rule (gotcha).** Setting the default input while chaining is an error, because the chain already bound it. `s.saw({ pitch: 60 })` errors — `.saw()` chained off the seq `s` already wired the oscillator's default input (`pitch`), and the object arg tries to set that same port. To set another value on a chained module, use a non-default port, or a positional that is not the default port.

```js
tempo(120)
const s = seq("c3 e3 g3 e3")
s.saw()
  .lpf({ cutoff: 89, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()
```

Here `s.saw()` chains an oscillator off the seq's default output without re-setting its default input, so pitch flows in cleanly. The envelope is taken from `s.gate` as a separate tap and multiplied in.

---

## 4. Value semantics and honesty

Setters return new values; the original is unchanged. A discarded value is not merely unused — it is unregistered. A chain that never reaches `out()` is pruned at compile time. It is garbage, not a silent zombie.

```js
const base = tri(57)
const bright = base.lpf({ cutoff: 102 }) // new value; base unchanged
base.lpf({ cutoff: 67 }) // discarded — never reaches out(), so it is pruned
bright.gain(0.3).out()
```

Only `bright.gain(0.3).out()` produces sound. `base` is untouched and the dead `base.lpf({ cutoff: 67 })` value evaporates.

---

## 5. The ambient clock

`tempo(120)` sets the ambient tempo in BPM. Every `seq` and every beat-domain consumer uses it with no explicit wiring. One pattern cycle is one bar of four beats. `tempo()` is a setting: it may appear once per patch. To give one `seq` another position, pass it as the second argument, for example `seq("c3 e3", clock(90))`.

```js
tempo(110)
seq("c3 e3 g3")
  .tri()
  .mul(seq("c3 e3 g3").gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()
```

Neither `seq` names a clock; both run at 110 BPM from the ambient clock.

---

## 6. Patterns: notation and combinators

A pattern is either a mini-notation string passed to `seq("...")`, or a `` p`...` `` tagged template when you want combinators.

### Mini-notation grammar (with desugaring)

| Notation | Meaning |
|---|---|
| `c3 e3` | sequence (fastcat) |
| `~` | rest: a step with the gate low |
| `[a b]` | subdivide one step |
| `[a, b]` | chord: stack (polyphony; widens) |
| `<a b>` | alternate per cycle |
| `{a b c, d e}` | polymeter, steps from the first layer |
| `a*2` / `a/2` | faster / slower within a step |
| `a!2` | replicate (adds steps) |
| `a@2` | weight (timecat): one longer step |
| `a _` | tie: two steps, one note |
| `a_b` | slide: `b` entered legato from `a`, no trig |
| `a?` / `a?0.7` | maybe: a rest with chance 0.5 / 0.7 |
| `a(3,8)` / `a(3,8,2)` | euclid (with rotation) |

Notes are MIDI: `c4` = 60, `c3` = 48, accidentals `#` and `b`. Bare numbers are MIDI semitones.

Rests and ties are events, so every step exists whether it sounds or not. `?`, `.degrade()`, and the empty slots of a euclid keep their step as a rest. `a@2` and `a _` sound the same; they differ when read by steps.

### Combinators

Methods on a `P` value (from `` p`...` ``):

`.fast(n)`, `.slow(n)`, `.rev()`, `.early(a)`, `.late(a)`, `.every(n, q => ...)`, `.iter(n)`, `.ply(n)`, `.euclid(k, steps, rot)`, `.degrade(p)`, `.add(semis)`, `.mul(f)`, `.off(amt, q => ...)`, `.steps()`, `.compact()`, `.swingBy(amount, n)`, `.swing(n)`.

`.steps()` re-times by steps: the nth event, rests and ties included, spans step n. A top-level stack counts each layer on its own; a chord inside a sequence is one step. `.compact()` drops rests.

Statics: `P.stack`, `P.cat`, `P.fastcat`, `P.timecat([2, p], [1, q])`, `P.polymeter`.

### Splicing

A `` p`...` `` template interpolates P values, numbers, and arrays: `` p`${hook} ${hook.rev()}` ``.

```js
tempo(110)
const hook = p`c3 [e3 g3] a3 ~`
seq(hook.rev().every(2, (q) => q.add(7)))
  .tri()
  .mul(seq(hook.rev().every(2, (q) => q.add(7))).gate.adsr(0.005, 0.1, 0.4, 0.15))
  .gain(0.3)
  .out()
```

The runnable block above repeats the transformed pattern so it is self-contained. In practice, name the transformed line once and reuse it:

```
const line = seq(hook.rev().every(2, (q) => q.add(7)))
line.tri().mul(line.gate.adsr(...))...
```

That is the recommended shape.

### Determinism

`?` and `.degrade()` are seeded — the decision is a hash of seed, node-path, and cycle number. They produce the same result every run and are stable under scrubbing.

`seed(n)` sets the patch seed. It is a setting like `tempo()`: once per patch, anywhere in the code. Without it, the editor draws a seed when play starts and keeps it until stop or reroll. The editor shows the seed, so you can pin one you like. `.seed(n)` on a pattern or a module gives that part its own seed, so it stays put when the patch seed changes. Seeds are integers.

```js
tempo(120)
seed(7)

const hook = seq(p`c4 e4 g4 b4`.fast(2).degrade(0.4))
hook.tri()
  .mul(hook.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .gain(0.3)
  .out()

const ghost = seq(p`c5*8`.degrade(0.6).seed(3))
ghost.sin()
  .mul(ghost.gate.ad(0.002, 0.05))
  .gain(0.15)
  .out()
```

---

## 7. seq, gate, trig, and slide

`seq(pattern)` is a node. It has four outputs:

- `out` — the default output: the value itself. MIDI semitones, sample-and-held, holds the last value through rests. Use the seq directly; `out` is not a tap name.
- `.gate` — `1` inside a note, a slide, or their ties, minus a fixed pre-release gap of about 1 ms before the next note.
- `.trig` — a single-sample pulse when the position enters a different note. A tie and a slide entered from the note before them fire nothing.
- `.slide` — `1` inside a slide. `s.slew(s.slide.mul(0.03), s.slide.mul(0.03))` glides only on slides.

Chaining `seq(...)` directly chains from the value: `seq(...).tri()` plays its pitch.

Drums are driven by `.trig`:

```js
tempo(120)
seq(p`60(3,8)`).trig.kick().gain(0.9).out()
seq("~ 60 ~ 60").trig.snare().gain(0.7).out()
seq("60*8").trig.hihat({ decay: 0.04 }).gain(0.4).out()
```

Each drum module takes a trigger at its default input and fires on the pulse.

---

## 8. Polyphonic width

A `[a,b,c]` chord widens the seq into one packed lane per voice. Chaining forwards per-lane — each lane becomes its own synth voice — and `out` mixes the lanes with `1/√n` scaling to keep level sane. Width is static: it is fixed at compile time.

```js
tempo(90)
const pad = seq("[c3,e3,g3]")
pad.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(pad.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()
```

Three-note stack → width 3. The oscillator, filter, and envelope run independently per lane; `out` sums them.

---

## 9. Modulation

Any input accepts a number, another module's output, a lambda, or a pattern. For Hz-rate modulation, patch an `lfo` into a knob.

```js
saw(45)
  .lpf({ cutoff: lfo(0.3, 62, 95), res: 0.3 })
  .gain(0.3)
  .out()
```

`lfo(0.3, 62, 95)` sweeps the cutoff between semitones 62 and 95 (roughly 300–2000 Hz) at 0.3 Hz.

Setting a port replaces its value. To add modulation on top of a value, use `.mod(port, signal, depth)`: the port becomes its base plus `signal × depth`, and several `.mod` calls on one port sum. `lpf({ cutoff: 60 }).mod("cutoff", lfo(0.3), 12)` swings the cutoff 12 semitones either side of 60.

### Pattern-as-signal

A `` p`...` `` handed to any knob lifts automatically into a `seq`. It is read at the ambient clock's position and sample-and-held, so a pattern can drive pitch directly:

```js
tempo(100)
tri(p`48 55 60 63`)
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()
```

### Slew-declick idiom

A lifted pattern steps discontinuously. Driving a filter cutoff with raw steps clicks. Wrap the pattern in `slew({ in: ..., rise, fall })` with tiny rise/fall to glide the steps:

```js
tempo(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p`67 79 [91 62] <55 103>`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.5 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.25)
  .out()
```

### Quantize to a scale

Snap an LFO-driven pitch onto a scale with `.quantize({ scaleName, root })`:

```js
sin()
  .pitch(lfo(0.2, 36, 72).quantize({ scaleName: "minor pentatonic", root: 0 }))
  .lpf({ cutoff: 91, res: 0.2 })
  .gain(0.3)
  .out()
```

The slow LFO ramps pitch from 36 to 72 semitones; `quantize` snaps each value to the nearest minor-pentatonic degree.

---

## 10. loop() feedback

A cycle in the graph is only legal if it passes through one unit delay. Write it as `loop(fb => ...)`, where `fb` is the fed-back signal exactly one sample late. This covers filter pinging, echoes, Karplus-Strong, and any recursive structure.

```js
saw(45)
  .mul(lfo(2).gt(0).mul(0.5))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: 0.18, mix: 1 }).mul(0.6))))
  .gain(0.3)
  .out()
```

The dry signal plus a delayed, attenuated copy of the loop's own output forms the echo. `fb` is the previous sample of the loop result.

---

## 11. Stereo (two-cable patching)

For placement, `pan` produces `l` and `r` outputs. Stereo ports connect by name, so `.out()` wires `l` to `l` and `r` to `r`:

```js
tempo(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .pan(lfo(0.5, -1, 1))
  .out()
```

The LFO sweeps the pan position. A connection that would drop a channel, such as `pan(0.5).lpf(79)`, is a loud error.

`spread(amount)` places the lanes of a wide signal evenly across `[-amount, amount]`: at 1, the first lane is hard left and the last hard right. Per-lane detune is a pattern stack added to the pitch — it makes one lane per offset:

```js
tempo(90)
const s = seq("c3 g2 a2 f2")
s.add(p`[-0.12, 0, 0.12]`)
  .saw()
  .lpf(84, 0.2)
  .mul(s.gate.adsr(0.01, 0.2, 0.6, 0.3))
  .gain(0.3)
  .spread()
  .out()
```

Three saws per note, 12 cents apart, fanned left, center, right.

---

## 12. counter (stepping by trigger)

`seq` reads a pattern at any position, not only the clock's. `counter(trig)` counts triggers into a step position, and `.steps()` makes each event of a pattern one step. So `` counter(trig).seq(p`a b ~ c`.steps()) `` moves one step on each trigger, rests and ties included. This is analog step-sequencer behavior: one step per trigger, nothing to do with the pattern's own timing. Any trigger works — a seq's `.trig`, or a comparator on an LFO. The first trigger holds step 0. `reset` returns the count to the start; `length` wraps it.

```js
tempo(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(counter(s.trig).seq(p`0.3 0.1 0.25 0.15`.steps()))
  .gain(0.9)
  .out()
```

Each note trigger steps the accent pattern forward, cycling `0.3, 0.1, 0.25, 0.15` regardless of note lengths.

---

## 13. Troubleshooting and the loud-error philosophy

The language never silently no-ops. At eval time it throws — naming what was actually available — for:

- unknown parameter names,
- unconnected required inputs,
- arity surprises,
- notation parse errors,
- a stereo connection that would drop a channel.

### Common footguns

- **`sin(0)` sets PITCH to 0** (≈8.18 Hz), not silence — pitch is the positional default. For a default A4 use `sin()`; for an exact Hz value use `sin(hz(...))`.
- **Forgetting `tempo(...)`** leaves seqs without a clock.
- **`.mod` is modulation**, not modulo: `.mod(port, signal, depth)` adds `signal × depth` to a port. Modulo is `wrap`. And `factory()` is the module-lookup helper, not a musical term.
- **A pattern into a filter cutoff clicks** without a `slew` — see the slew-declick idiom.
