# Auxlang: The Platonic Design

A greenfield specification. No debt to the current implementation; where the two
agree, the implementation was already right.

---

## 0. Thesis

The uzulangs (Tidal, Strudel, Vortex) put the **pattern** at the center and bolt a
synth onto the end: `Pattern → Events → SuperDirt`. Modular synthesis puts the
**signal** at the center and bolts sequencing onto the side: everything is voltage,
a sequencer is just a module that emits some. Each tradition has what the other
lacks — uzulangs have a transformational pattern algebra and nothing to patch;
modulars have infinite patchability and no algebra of time.

Auxlang's claim: these are one language with **two time domains and one bridge**.

- The **pattern calculus**: discrete, cycle-based, rational time. Patterns are
  pure, transformable, deterministic values.
- The **signal calculus**: continuous, sample-based time. Modules are pure state
  machines wired into a graph. Feedback is legal.
- The **bridge**: a clock is a signal (a phase ramp in beats); a sequencer is a
  module that queries a pattern with that phase and emits pitch/gate/trig — which
  are just signals, and go anywhere any signal goes.

Everything below is the working-out of that claim under three invariants:

1. **Signal uniformity.** Anything that produces a value over time can be used
   anywhere a value over time is consumed. No privileged positions.
2. **Pattern transparency.** Patterns are first-class values. Mini-notation is
   literal syntax — sugar with a total desugaring into combinators. Nothing is
   expressible in notation that isn't expressible (and transformable) as a value.
3. **Determinism.** A performance is a pure function of (code, seed, time). Same
   code, same seed → same audio, same visualization, every run, on every thread.

---

## 1. The five concepts

The whole language is five concepts. Everything else is a library.

| Concept | What it is | Analogy |
|---|---|---|
| **Signal** | a value stream at audio rate, width *n* | a bundle of patch cables |
| **Module** | a pure state transition `(state, inputs) → (state′, outputs)` | a Eurorack module |
| **Patch** | a pure expression denoting a graph of modules | the patched system |
| **Pattern** | a pure value: `Cycle → [Event]`, rational time | a musical score fragment |
| **Clock** | the bridge: a phase signal in beats, ambient by default | the master clock bus |

There is no sixth concept. No event bus, no voice allocator, no message queue, no
scheduler. Discrete musical structure lives in patterns; everything at runtime is
a signal.

---

## 2. Signals

A signal is a stream of real-number frames of **width n** (n ≥ 1). Width is the
polyphony dimension and it is static: fixed when the patch is compiled.

- Scalars broadcast: a width-1 signal used where width-3 is consumed is applied
  to every lane.
- Modules process **per-lane by default** (map). A module declared as a
  *reducer* (`mix`, `out`) consumes all lanes; a *reshaper* (`pan`) maps each
  lane to a stereo `{l, r}` position via a constant-power law. Stereo is explicit
  two-cable patching: a stereo source's two channels feed the master's `l`/`r`
  jacks with `out({ l: v.l, r: v.r })`. A bare `.out()` chained off a stereo
  source is a loud error — it would drop one channel.
- `sig.width` is known statically. `sig.lane(i)` selects one lane (width 1).

Units are **conventions, not types**. A signal is numbers; modules document what
they expect. The conventions:

| Quantity | Unit | Rationale |
|---|---|---|
| pitch | **semitones** (MIDI numbering, 69 = A440) | linear pitch: transpose = add, glide = slew, quantize = round. Hz appears only inside oscillators. |
| audio | −1..1 linear | |
| control knobs | 0..1 | |
| time (musical) | beats | resolved against the governing clock |
| time (physical) | seconds | envelopes, physical delays |
| phase | beats, unbounded ramp | what clocks emit |
| gate | 0/1, threshold 0.5 | |
| trig | single-sample 1 | |

Pitch in semitones is load-bearing: it is what makes `.add(12)` an octave, makes
`slew` a correct portamento, makes quantizers linear, and makes pattern
arithmetic musical. `hz(x)` and `semis(x)` convert explicitly when needed.

---

## 3. Patterns

A pattern is a pure value: a function from a cycle-span to timed events, with
**rational** onsets and durations (exact under any nesting of triplets against
quintuplets; no float drift, ever). Patterns are polymorphic: patterns of notes,
of numbers, of anything a module parameter accepts.

### 3.1 The algebra

The combinators are the language. Notation (3.2) is sugar for them.

```js
p.fast(2)  p.slow(2)          // scale time
p.rev()                        // reverse within each cycle
p.early(1/8)  p.late(1/8)      // rotate
p.every(4, q => q.rev())       // apply a transform every nth cycle
p.iter(4)                      // shift starting point each cycle
p.ply(2)                       // repeat each event in place
p.euclid(3, 8)  p.euclid(3,8,2) // euclidean mask, with rotation
p.degrade(0.3)                 // drop events with probability (seeded)
p.add(12)  p.mul(2)            // arithmetic on payloads (semitones!)
p.off(1/8, q => q.add(12))     // overlay a transformed, shifted copy
stack(p, q)                    // simultaneous (widens)
cat(p, q)                      // one per cycle
fastcat(p, q)                  // squeezed into one cycle
```

Two properties matter more than the list:

- **Closure.** Every combinator takes patterns and returns a pattern. Transforms
  compose without restriction: `p.euclid(3,8).every(2, q => q.rev()).fast(2)`.
- **Purity.** Querying a pattern at cycle *c* allocates nothing persistent and
  depends on nothing but (pattern, c, seed). Randomness (`degrade`, `?`) is a
  hash of (seed, node path, cycle) — scrub-safe, reversible, identical across
  audio thread and visualization.

### 3.2 Notation

Mini-notation is a tagged template literal. Interpolation splices values —
patterns, notes, numbers, arrays — so notation and combinators mix freely:

```js
let hook = p`c4 [e4 g4] <a4 b4>`
let line = p`${hook} ${hook.rev().add(12)} ~ ${hook.fast(2)}`
```

The grammar, with its total desugaring:

| Notation | Meaning | Desugars to |
|---|---|---|
| `c4 e4` | sequence within cycle | `fastcat(c4, e4)` |
| `~` | rest | `silence` |
| `[a b]` | subdivide one step | `fastcat(a, b)` as one step |
| `<a b>` | alternate per cycle | `slowcat(a, b)` |
| `{a, b}` | stack (widens) | `stack(a, b)` |
| `a*2` | repeat within step | `a.fast(2)` |
| `a!2` | replicate (adds steps) | `fastcat(a, a)` |
| `a@2` | hold across 2 steps | weight 2 |
| `a _ b` / `a_b` | tie (legato) | duration extension |
| `a?` `a?.75` | maybe | `a.degrade(0.5)` / `.degrade(0.25)` |
| `a(3,8)` `a(3,8,2)` | euclidean | `a.euclid(3,8,2)` |

The desugaring table is normative: if a notation form has no combinator
equivalent, the notation form is wrong. Parse errors are loud; there is no
"parses but plays nothing."

---

## 4. The bridge

### 4.1 Clock

A clock is a module emitting a **phase ramp in beats** plus `gate`/`trig`. Tempo
is an input — a signal — so tempo modulation (ritardando, swing-as-warp, LFO on
tempo) is ordinary patching.

One clock is **ambient**: `clock(120)` at the top of a program sets it, and every
beat-domain consumer (sequencers, beat-unit times) uses it unless handed another
one explicitly. Multiple explicit clocks coexist; polymeter is two clocks. The
ambient clock is the composition root, not a global mutable — it is bound at
eval, per patch.

### 4.2 Sequencer

`seq(pattern)` is a module: phase in, signals out.

- `pitch` — semitones, sample-and-held per event
- `gate` — high for the event's sounding duration (gap policy: fixed ~1 ms
  pre-release for retrigger, never proportional)
- `trig` — single-sample pulse at each non-tied onset
- width — the pattern's maximum simultaneity, packed. `{c4,e4,g4}` is width 3.
  `{a,b} {c,d,e}` is width 3, lanes packed, no silent lanes.

Because output is a pure function of (pattern, phase, seed), the sequencer is
scrubbable: jump the phase anywhere, run it backwards, the output is defined and
deterministic. Alternation is `cycle mod n`, never visit-counting.

### 4.3 Patterns as signals

A pattern used where a signal is expected lifts implicitly: it is queried at the
governing clock's current position, sample-and-held. This is the uniformity
invariant paying rent:

```js
clock(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p`400 800 [1600 200] <200 3200>`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.4 })                            // pattern-modulated cutoff
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
```

Any knob on any module is patternable with zero ceremony. Stepping a pattern into
a continuous control (a filter cutoff) produces audible clicks at each step edge;
the shipped idiom wraps the pattern in `slew` to declick, giving glide between
values (shown in §10).

### 4.4 The analog direction

Patterns can also be advanced by **trigger, not phase** — analog step-sequencer
semantics: `patstep(pattern, trigSignal)` emits the next event payload on each
trigger, ignoring event durations. Feed it a euclidean gate, a comparator on an
LFO, a manual button — this is where the modular half earns its keep, and no
uzulang can express it. (Automatic pattern-as-signal lifting, §4.3, produces
`patsig` nodes internally; `patstep` is the explicit trigger-domain stepper.)

---

## 5. Modules

A module is a Mealy machine. The entire contract:

```js
module("lpf", {
  in:   { audio: sig(0), cutoff: hz(1000), res: unit(0.2) },
  out:  { audio: sig() },
  state: () => ({ ic1: 0, ic2: 0 }),
  tick: (s, i, o, sr) => { /* pure: reads i and s, writes o and s */ },
})
```

- **`in`/`out`** declare names, defaults, and unit annotations. Annotations
  (`hz`, `unit`, `semis`, `beats`, `secs`, `sig`) are *documentation with
  behavior* — they drive UI, error messages, and beat-unit resolution — but they
  are not a type system and never reject a number.
- **`state`** is an explicit constructor. State is plain serializable data
  (numbers, typed arrays). This single rule is what makes live re-eval state
  migration, inspection, and time-travel debugging mechanical.
- **`tick`** runs per sample per lane. Reducers/reshapers declare a lane policy
  and receive lane arrays. Heavy DSP compiles to WASM behind the same contract.
- The first parameter is the default input (chain target); the first output is
  the default output. Everything else is explicit.

One namespace, consistent port names: default output is `out` everywhere;
semantic outputs (`pitch`, `gate`, `trig`) only where those words mean exactly
that. No `cv`/`audio`/`signal`/`val` dialects.

Time-valued inputs accept both domains: a plain number means the declared unit;
`beats(3/8)` and `secs(0.02)` convert explicitly.

### 5.1 The oscillator family

`osc`/`sin`/`saw`/`tri`/`sqr` share one input surface:

- `pitch` — semitones, default 69 (A4). This is the **default input** — chaining
  `s.saw()` off a sequencer's pitch tap plays it musically.
- `freq` — Hz, optional. When connected it **wins** over `pitch`.
- `min`/`max` — output range, default −1/1.
- `phase` — initial phase.

Positional args are `[freq, min, max]`. So `sin(0.3, 100, 800)` is an LFO
(0.3 Hz, ranged 100..800), while `saw()` chained from a seq's pitch tap plays a
note. Footgun: `sin(0)` sets freq to 0 → silence; use `sin()` for the default A4,
or `sin({ pitch: 60 })` to pitch it explicitly.

### 5.2 Amplitude

Amplitude is multiplication: `.mul(x)` multiplies two signals. `gain` and `vca`
are aliases of `mul` — `.gain(0.3)` reads as a fixed level, `.mul(env)` reads as
a VCA. Gain takes one factor (positional or `by`); there is no object form.

### 5.3 Envelopes

The envelope family is three modules, all gate-triggered:

- `ad(attack, decay)` — rising-edge triggered; ignores gate length.
- `ar(attack, release)` — attacks while the gate is high, releases on its drop.
- `adsr(attack, decay, sustain, release)` — the full four-stage envelope.

---

## 6. The patch

A program is a JS expression. Module calls, chains, setters, and combinators
construct **pure values** — nothing exists, costs, or sounds until it reaches an
output.

```js
clock(124)

let s = seq(p`c3 [e3 g3] <a2 b2> ~`.every(4, q => q.rev()))
s.pitch.saw()
  .lpf({ cutoff: sin(0.2, 400, 2600), res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.2))
  .out()
```

- **Value semantics, honestly.** `x.cutoff(800)` returns a new value; the old
  one is unchanged *and unregistered*. A discarded chain is garbage, not a
  zombie. Evaluation collects the roots (`out` calls), prunes everything
  unreachable, compiles what remains.
- **`out()` is the only effect.** It marks a root and returns nothing.
- **Binding is `apply`** when a chain needs its own intermediate:
  `clockDiv(4).apply(c => ...)`. With the ambient clock and pattern-lifting,
  the need is rare.
- **Loud failure.** Unknown parameter names, unconnected required inputs,
  arity surprises: errors, at eval time, naming what was available. A live
  language must never silently no-op.

### 6.1 Feedback

Cycles are legal. A cycle must pass through one explicit unit delay, written as
the `loop` combinator — the fed-back value arrives one sample late:

```js
// Karplus–Strong: a noise burst circulating in a short filtered delay
clock(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008)).mul(0.5)
loop((fb) =>
  exciter.add(fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 2400 }).mul(0.96)),
).gain(0.3).out()
```

`loop(f)` is the fixpoint of the signal graph (ArrowLoop, for those keeping
score); operationally it is a patch cable run from an output back to an input,
which is all feedback ever was. Filter pinging, FM feedback, cross-modulation,
send loops — first-class, not baked into individual effects. (Note: `mod` is the
modulo module, distinct from `mul`; don't confuse the two in a feedback path.)

### 6.2 Identity and live re-eval

Re-evaluation is the core interaction, so its semantics are language-level:

- The new graph is diffed against the running one **structurally**; matching
  nodes keep their state (oscillator phase, delay lines, envelope position, seq
  position). `x.id("bass")` pins identity explicitly when structure changes but
  state should survive.
- The master phase is continuous across evals; patterns pick up mid-cycle.
- The old and new graphs crossfade equal-power over a short window.
- Because module state is data (§5), migration is clone-and-carry — including
  WASM, which serializes through the same contract.

---

## 7. Determinism

One seed per performance (re-eval preserves it; a new seed is an explicit act).
Every stochastic element — pattern `?`, `degrade`, noise sources, random LFOs —
derives its stream from (seed, structural path). Consequences, all mandatory:

- Audio and visualization agree: the highlight never shows a note the audio
  skipped.
- A performance is replayable from (code history, seed).
- Rendering offline equals rendering live, sample for sample.

---

## 8. Runtime obligations

The spec constrains the implementation only where semantics leak through:

- **Sample-accurate, single-rate.** One tick per sample; gates and trigs land on
  the exact sample. No event scheduler, no block-quantized control.
- **The audio thread allocates nothing** in steady state. Pattern queries per
  cycle are precomputed or allocation-free; module ticks write into
  preallocated frames.
- **Library code lives in the audio thread** (bundled), not serialized through
  strings. Only user-written inline lambdas cross the boundary by value.
- Mixing and spatialization at the boundary: reducers use equal-power laws;
  `out` applies 1/√n lane mixdown, a DC guard, and a true-peak safety clip.

---

## 9. What is deliberately absent

Absences are design decisions, listed so they are not mistaken for gaps:

- **No unit type system.** Conventions and annotations, not a checker. The
  patch that "makes no sense" and sounds great is the point of modular.
- **No dynamic voice allocation.** Width is static; a fixed-width round-robin
  allocator is a library module, not a language concept.
- **No event/message layer.** If it changes over time, it is a signal; if it is
  musical structure, it is a pattern. There is no third thing.
- **No macro layer.** JS is the metaprogramming: functions that return patches,
  arrays mapped into stacks, combinators written by users in userland.
- **No inheritance.** Modules compose by patching; there is no module taxonomy.
- **No MIDI-first design.** MIDI in/out are modules at the boundary
  (`midiIn().pitch`, `midiIn().gate`), not an organizing principle.

### 9.1 Backlog — vision not yet shipped

Named so they are not mistaken for shipped API:

- **`spread`** — a one-call stereo widener. Today stereo is explicit two-cable
  patching into `out({ l, r })` (§2).
- **Oscillator `fine` detune** — per-lane detune arrays on the oscillator family.
- **`beats()` tempo-sync for physical times** — beat-domain delay/envelope times
  that retune live with the clock. Today those times are in seconds; a synced
  delay is not yet expressible.

---

## 10. A closing patch

Everything at once — ambient clock, pattern algebra, notation splicing,
pattern-as-signal modulation, per-lane poly, explicit stereo patching,
trigger-domain stepping, feedback:

```js
clock(126)

// pads: width-3 stack, packed lanes, pattern-modulated cutoff, panned wide
const padP = p`{c3,e3,g3} <{a2,c3,e3} {f2,a2,c3}>`.slow(2)
const pad = seq(padP)
pad.pitch.saw()
  .lpf({ cutoff: p`400 <800 1600>`.slow(2), res: 0.2 })
  .mul(pad.gate.adsr(0.4, 0.3, 0.7, 1.2))
  .pan(0.4)
  .apply((v) => out({ l: v.l, r: v.r }))

// acid line: transformed hook, feedback delay
const hook = p`c2 [c2 eb2] g1 <bb1 c2>`
const line = seq(hook.every(4, (q) => q.rev()).off(1 / 8, (q) => q.add(12).degrade(0.4)))
loop((fb) =>
  line.pitch.slew(0.03).saw()
    .lpf({ cutoff: line.gate.adsr(0.001, 0.12, 0, 0).mul(3000).add(180), res: 0.85 })
    .mul(line.gate)
    .add(fb.delay({ time: 0.35, mix: 1 }).mul(0.35)),
).gain(0.5).out()

// drums: euclidean kick, backbeat snare, hat velocity stepped by a comparator
seq(p`60(4,4)`).trig.kick().out()
seq("~ 60 ~ 60").trig.snare().out()
sin(9).gt(0.7).apply((tg) => tg.hihat().mul(patstep(p`1 0.6 0.8 0.5`, tg)).gain(0.8).out())
```

Every line is the same language: patterns are values, signals are values, and
the bridge between them is just another cable.
