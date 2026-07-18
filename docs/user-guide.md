# Auxlang User Guide (core3)

A systematic guide to writing patches in core3.

---

## 1. Fundamentals

A patch is a JavaScript expression. Evaluating it builds pure values that describe a signal graph; nothing sounds. The only effect is `out()`: a value reaches audio precisely when it flows into `out()`. Everything else is construction.

A chain reads left-to-right: source → processors → out.

```js
tri(220)
  .lpf({ cutoff: 1200, res: 0.2 })
  .gain(0.3)
  .out()
```

A triangle oscillator at 220 Hz feeds a low-pass filter, then an amplitude scale, then output. Read top to bottom, it is the whole strategy: what the sound is, what shapes it, that it plays.

---

## 2. Modules

Modules are pure state machines with named inputs and outputs. Each has a default input (the target when a chain flows into it) and a default output (what a chain reads from it next). You make one by calling a factory. Three ways to fill its ports:

- Positional args fill declared ports in their declared order.
- An object arg names ports explicitly.
- Method setters copy-with-change: `x.lpf({ cutoff: 400 })` returns a new value.

The module families:

### Sources

- `osc` / `sin` / `saw` / `tri` / `sqr` — oscillators. Pitch is in MIDI semitones and defaults to 69 (A4). Frequency is in Hz, optional, and wins when set. There is an output range (`min`/`max`). Positional signature is `[freq, min, max]`, so `sin(0.3, 100, 800)` is a slow LFO sweeping 100–800.
- `noise` — noise source.

### Filters

- `lpf` / `hpf` / `bpf` / `notch` — `{ cutoff, res }`, positional `[cutoff, res]`.

### Envelopes (gate-driven)

- `ad(attack, decay)`
- `ar(attack, release)`
- `adsr(attack, decay, sustain, release)`

### Amplitude and math

- `mul` (aliases `gain`, `vca`), `add`, `sub`, `div`, `mod` (modulo — arithmetic remainder, not "modulation"), `abs`, `clip`, `scale`, `slew`, `sah`, `quantize`.

### Comparators

- `gt`, `lt`, `eq` — emit `0`/`1` gates.

### Effects

- `delay({ time, feedback, mix })` — `time` in seconds.
- `pan({ pos })` — constant-power pan, outputs `l` and `r`.

### Timing and bridge

- `clock`, `seq`, `patstep`, `patsig`. `patsig` is created automatically by pattern-lifting; you rarely name it.

### Drums (trigger-driven, default input `trig`)

- `kick`, `snare`, `hihat`, `clap`.

### Reducer and output

- `mix`, `out`.

---

## 3. Chaining

`.method()` continues the chain from the previous value's default output. `s.tri()` chains a triangle from `s`'s default output.

**Signal-uniformity rule (gotcha).** Setting the default input while chaining is an error, because the chain already bound it. `seq.pitch.saw({ freq: 880 })` errors — `.saw()` chained off `seq.pitch` already wired the oscillator's default input, and `freq` is that same default port. To set another value on a chained module, use a non-default port, or a positional that is not the default port.

```js
clock(120)
const s = seq("c3 e3 g3 e3")
s.pitch.saw()
  .lpf({ cutoff: 1400, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()
```

Here `s.pitch.saw()` chains an oscillator off the pitch tap without re-setting its default input, so pitch flows in cleanly. The envelope is taken from `s.gate` as a separate tap and multiplied in.

---

## 4. Value semantics and honesty

Setters return new values; the original is unchanged. A discarded value is not merely unused — it is unregistered. A chain that never reaches `out()` is pruned at compile time. It is garbage, not a silent zombie.

```js
const base = tri(220)
const bright = base.lpf({ cutoff: 3000 }) // new value; base unchanged
base.lpf({ cutoff: 400 }) // discarded — never reaches out(), so it is pruned
bright.gain(0.3).out()
```

Only `bright.gain(0.3).out()` produces sound. `base` is untouched and the dead `base.lpf({ cutoff: 400 })` value evaporates.

---

## 5. The ambient clock

`clock(120)` at the top of a patch sets the ambient tempo in BPM. Every `seq` and every beat-domain consumer uses it with no explicit wiring. The first `clock()` wins as the ambient clock; you can pass an explicit clock to a particular `seq` to override it locally.

```js
clock(110)
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
| `~` | rest |
| `[a b]` | subdivide one step |
| `<a b>` | alternate per cycle |
| `{a,b}` | stack (polyphony; widens) |
| `a*2` | repeat within a step |
| `a!2` | replicate (adds steps) |
| `a@2` | hold / weight |
| `a _ b` | tie / legato |
| `a?` / `a?.75` | maybe (degrade) |
| `a(3,8)` / `a(3,8,2)` | euclid (with rotation) |

Notes are MIDI: `c4` = 60, `c3` = 48, accidentals `#` and `b`. Bare numbers are MIDI semitones.

### Combinators

Methods on a `P` value (from `` p`...` ``):

`.fast(n)`, `.slow(n)`, `.rev()`, `.early(a)`, `.late(a)`, `.every(n, q => ...)`, `.iter(n)`, `.ply(n)`, `.euclid(k, steps, rot)`, `.degrade(p)`, `.add(semis)`, `.mul(f)`, `.off(amt, q => ...)`.

Statics: `P.stack`, `P.cat`, `P.fastcat`.

### Splicing

A `` p`...` `` template interpolates P values, numbers, and arrays: `` p`${hook} ${hook.rev()}` ``.

```js
clock(110)
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

---

## 7. seq, gate, and trig

`seq(pattern)` is a node. It exposes three taps:

- `.pitch` — the default output. MIDI semitones, sample-and-held, holds the last value through rests.
- `.gate` — `1` while an event sounds, minus a fixed pre-release gap of about 1 ms (unless the event is tied).
- `.trig` — a single-sample pulse at each non-tied onset.

Chaining `seq(...)` directly chains from pitch: `seq(...).tri()` reads `.pitch`.

Drums are driven by `.trig`:

```js
clock(120)
seq(p`60(3,8)`).trig.kick().gain(0.9).out()
seq("~ 60 ~ 60").trig.snare().gain(0.7).out()
seq("60*8").trig.hihat({ decay: 0.04 }).gain(0.4).out()
```

Each drum module takes a trigger at its default input and fires on the pulse.

---

## 8. Polyphonic width

A `{a,b,c}` stack widens the seq into one packed lane per voice. Chaining forwards per-lane — each lane becomes its own synth voice — and `out` mixes the lanes with `1/√n` scaling to keep level sane. Width is static: it is fixed at compile time.

```js
clock(90)
const pad = seq("{c3,e3,g3}")
pad.tri()
  .lpf({ cutoff: 1400, res: 0.2 })
  .mul(pad.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()
```

Three-note stack → width 3. The oscillator, filter, and envelope run independently per lane; `out` sums them.

---

## 9. Modulation

Any input accepts a number, another module's output, a lambda, or a pattern. An LFO is nothing special — it is a slow oscillator patched into a knob.

```js
saw(110)
  .lpf({ cutoff: sin(0.3, 300, 2000), res: 0.3 })
  .gain(0.3)
  .out()
```

`sin(0.3, 300, 2000)` sweeps the cutoff between 300 and 2000 Hz at 0.3 Hz.

### Pattern-as-signal

A `` p`...` `` handed to any knob lifts automatically. It is queried at the ambient clock's phase and sample-and-held, so a pattern can drive pitch directly with no `seq`:

```js
clock(100)
tri(p`48 55 60 63`)
  .lpf({ cutoff: 1200, res: 0.2 })
  .mul(sin(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()
```

### Slew-declick idiom

A lifted pattern steps discontinuously. Driving a filter cutoff with raw steps clicks. Wrap the pattern in `slew({ in: ..., rise, fall })` with tiny rise/fall to glide the steps:

```js
clock(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p`400 800 [1600 300] <200 3200>`, rise: 5e-6, fall: 5e-6 })
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
  .pitch(sin(0.2, 36, 72).quantize({ scaleName: "minor pentatonic", root: 0 }))
  .lpf({ cutoff: 1600, res: 0.2 })
  .gain(0.3)
  .out()
```

The slow LFO ramps pitch from 36 to 72 semitones; `quantize` snaps each value to the nearest minor-pentatonic degree.

---

## 10. loop() feedback

A cycle in the graph is only legal if it passes through one unit delay. Write it as `loop(fb => ...)`, where `fb` is the fed-back signal exactly one sample late. This covers filter pinging, echoes, Karplus-Strong, and any recursive structure.

```js
saw(110)
  .mul(sin(2).gt(0).mul(0.5))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: 0.18, mix: 1 }).mul(0.6))))
  .gain(0.3)
  .out()
```

The dry signal plus a delayed, attenuated copy of the loop's own output forms the echo. `fb` is the previous sample of the loop result.

---

## 11. Stereo (two-cable patching)

There is no automatic stereo spread. A mono `x.out()` auto-centers. For placement, `pan` produces `l` and `r` outputs; patch both into the master's `l`/`r` jacks:

```js
clock(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .pan(sin(0.5, -1, 1))
  .apply((v) => out({ l: v.l, r: v.r }))
```

The LFO sweeps the pan position; `apply` unpacks the stereo value and wires both channels into `out`.

A bare `.out()` off a stereo source (such as `pan`) is a loud error — it would drop a channel. Route both explicitly.

---

## 12. patstep (trigger domain)

`patstep(pattern, trigSignal)` advances through the pattern's onset values on each rising trigger edge, ignoring durations. This is analog step-sequencer behavior: one step per trigger, nothing to do with the pattern's own timing. Any trigger works — a seq's `.trig`, or a comparator on an LFO.

```js
clock(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(patstep(p`0.3 0.1 0.25 0.15`, s.trig))
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
- a bare stereo `.out()`.

### Common footguns

- **`sin(0)` sets FREQ to 0** — that is silence. For a default A4 use `sin()`; to set pitch instead of frequency use `sin({ pitch: 60 })`.
- **Forgetting `clock(...)`** leaves seqs unclocked.
- **`mod` is modulo** (arithmetic remainder), not "modulation". And `factory()` is the module-lookup helper, not a musical term.
- **A pattern into a filter cutoff clicks** without a `slew` — see the slew-declick idiom.
