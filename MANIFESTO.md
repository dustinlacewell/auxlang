# Auxlang: The Platonic Design

The target design of the language. It says what auxlang is, not what is built.
The gap between this document and the code lives on the board
(`.devtool/features/`).

---

## 0. Thesis

The uzulangs (Tidal, Strudel, Vortex) put the **pattern** at the center and bolt a
synth onto the end. Modular synthesis puts the **signal** at the center and bolts
sequencing onto the side. Uzulangs have a pattern algebra and nothing to patch.
Modulars have infinite patching and no algebra of time.

Auxlang's claim: these are one language with **two calculi and one bridge**.

- The **pattern calculus**: discrete structure in rational time. Patterns are
  pure, transformable, deterministic values.
- The **signal calculus**: per-sample time. Modules are state machines wired into
  a graph. Feedback is legal.
- The **bridge**: `seq(pattern, position)` reads a pattern at a position, and the
  position is a signal. A clock gives a position in beats. A counter gives a
  position in steps. An LFO scans. The outputs are signals and go anywhere.

Three invariants:

1. **Signal uniformity.** Anything that produces a value over time can be used
   anywhere a value over time is consumed. No privileged positions.
2. **Pattern transparency.** Patterns are first-class values. Mini-notation is
   sugar with a total desugaring into combinators.
3. **Determinism.** A performance is a pure function of (timestamped code log,
   seed, input log). Same inputs → same audio, live or offline, on any machine.

---

## 1. The four concepts

| Concept | What it is | Rack analogy |
|---|---|---|
| **Signal** | a value per sample, width *n* | a bundle of patch cables |
| **Module** | a state machine `(state, inputs) → (state′, outputs)` | a module |
| **Pattern** | a pure function from position to events | a score fragment |
| **Read** | `seq(pattern, position)`: pattern × position signal → signals | a voltage-addressed sequencer |

Clocks and counters are ordinary modules that emit positions. Every patch also
has three properties, fixed at eval: each signal's **width**, each node's
**identity**, and the **seed**. There is no event bus, no voice allocator at
runtime, no message queue, no scheduler.

---

## 2. Signals

A signal is a stream of real-number frames of **width n** (n ≥ 1). Width is the
polyphony dimension. It is static: fixed when the patch compiles.

- Scalars broadcast: a width-1 signal used where width-3 is consumed feeds every
  lane.
- Modules process **per lane** by default. A *reducer* (`mix`, `out`) consumes
  all lanes. A *reshaper* (`pan`) maps each lane to a stereo position.
- `sig.width` is known statically. `sig.lane(i)` selects one lane.
- Ports connect **by name** when a whole module is passed: a source with `l`/`r`
  outputs into a destination with `l`/`r` inputs connects both. A bare `.out()`
  chained off `pan` connects `l→l`, `r→r`. A connection that would drop a
  channel is a loud error.

Units are **conventions, not types**:

| Quantity | Unit | Why |
|---|---|---|
| audio-band frequency (oscillator pitch, filter cutoff) | **semitones**, MIDI numbering, 69 = A440 | transpose = add, glide = slew, keytrack = add, sweeps are even to the ear |
| rate (LFO frequency, tempo) | Hz, BPM | 0.3 Hz is −57 semitones; rates are not pitches |
| audio | −1..1 | |
| control knobs | 0..1 | |
| time (musical) | beats | resolved against the governing clock |
| time (physical) | seconds | envelopes, delays |
| position | beats (clock) or steps (counter), unbounded | what `seq` reads |
| gate | 0/1, threshold 0.5 | |
| trig | single-sample 1 | |

Every port declares a unit. An untagged number or signal means that unit and is
never rejected. A **unit tag** — `hz(x)`, `semis(x)`, `secs(x)`, `beats(x)` —
says a value is in another unit, and the port converts it: `sin(hz(440))` is
exactly A440, `delay({ time: beats(3/4) })` follows the clock. A tag with no
conversion to the port's unit (`hz` into a time port) is a loud error. The same
tags declare ports in `defmod` (§5). `period(pitch)` is a module: seconds per
cycle of a pitch, for tuned delays. Hz appears inside oscillators and filters,
and at the physical edge.

---

## 3. Patterns

A pattern is a pure value: a function from a span of rational time to events.
Onsets and durations are **rational**: exact under any nesting of triplets
against quintuplets. Patterns are polymorphic: patterns of notes, numbers,
records, or signals (§4.4).

### 3.1 Events

An event is `{ whole, part, value, kind }`.

- `whole` is the event's full span; `part` is the slice inside the query.
  An onset is real only where `part` starts at `whole`'s start. This is what
  stops a note that crosses a cycle edge from restarting there.
- `kind` is `note`, `rest`, or `tie`. A **rest is an event** with its gate off.
  A **tie** continues the previous note: no trig, no gate dip.
- `value` is a number (semitones for notes) or a record of named numbers (§3.4).

Rests and ties are events so that every step exists, whether it sounds or not.
This is the analog step sequencer's model: a step with its gate switch off is
still a step.

### 3.2 The algebra

The combinators are the language. Notation (§3.3) is sugar for them.

```js
p.fast(2)  p.slow(2)            // scale time
p.rev()                          // reverse within each cycle
p.early(1/8)  p.late(1/8)        // rotate
p.every(4, q => q.rev())         // transform every nth cycle
p.iter(4)                        // shift start point each cycle
p.ply(2)                         // repeat each event in place
p.euclid(3, 8, 2)                // euclidean: 3 notes, 5 rests, rotated
p.degrade(0.3)                   // turn notes into rests with probability 0.3
p.add(12)  p.mul(2)              // arithmetic on values
p.off(1/8, q => q.add(12))       // overlay a transformed, shifted copy
p.with({ vel: q })               // add record fields, structure from p (§3.4)
p.steps()                        // re-time: the nth event spans [n, n+1)
p.compact()                      // drop rests
p.voices("stable", 3)            // assign events to lanes (§3.5)
p.seed(7)                        // local seed for this pattern's randomness
stack(p, q)  cat(p, q)  fastcat(p, q)  timecat([2, p], [1, q])  polymeter(p, q)
```

- **Closure.** Every combinator takes patterns and returns a pattern.
- **Purity.** A query depends only on (pattern, span, seed). Randomness (`?`,
  `degrade`) hashes (seed, node path, cycle). The same query always returns the
  same events, on any thread.
- **Static width.** Width is computed from structure: `stack` sums, sequences
  take the max, `every` takes the max of both branches, `off` sums. This works
  because every pattern is built from combinators (invariant 2). There is no
  escape hatch for raw user query functions; it would make width unknowable.

### 3.3 Notation

Mini-notation is a tagged template literal. It follows Strudel wherever Strudel
has a form. Interpolation splices patterns, numbers, arrays, and signals:

```js
const hook = p`c4 [e4 g4] <a4 b4>`
const line = p`${hook} ${hook.rev().add(12)} ~ ${hook.fast(2)}`
```

| Notation | Meaning | Desugars to |
|---|---|---|
| `c4 e4` | sequence within cycle | `fastcat(c4, e4)` |
| `~` | rest | a `rest` event |
| `[a b]` | subdivide one step | `fastcat(a, b)` as one step |
| `[a, b]` | play together (chord) | `stack(a, b)` |
| `<a b>` | alternate per cycle | `cat(a, b)` |
| `{a b c, d e}` | polymeter, steps from first layer | `polymeter(...)` |
| `a*2` `a/2` | faster / slower within step | `a.fast(2)` / `a.slow(2)` |
| `a!2` | replicate (adds steps) | `a a` in the enclosing sequence |
| `a@2` | weight 2 (one longer step) | `timecat([2, a], ...)` |
| `a _` | tie (two steps, one note) | `a` then a `tie` event |
| `a?` `a?0.7` | maybe | `a.degrade(0.5)` / `a.degrade(0.7)` |
| `a(3,8,2)` | euclidean | `a.euclid(3, 8, 2)` |

The table is normative: a notation form without a combinator is a bug. Parse
errors are loud.

`a@2` and `a _` sound the same when read by time. They differ when read by
steps: `a@2` is one step, `a _` is two.

### 3.4 Records

A step can carry several values, like the rows of a hardware sequencer:

```js
const s = seq(p`c3 e3 g3 b3`.with({ vel: p`1 0.4 0.7`, cv2: p`0 1` }))
s.saw().mul(s.vel)
```

`with` takes structure from the left pattern. Each field is sampled at the left
pattern's onsets, so fields never drift out of step. `seq` exposes each field
as an output.

### 3.5 Voices

`.voices(policy, n)` assigns events to `n` lanes. It is a pure function over the
event stream, so it stays deterministic.

- `"packed"` (default): stack order fills lanes from 0.
- `"stable"`: a note that continues keeps its lane.
- `"rr"`: round-robin, so release tails ring out in their own lane.

For `packed` and `stable`, `n` defaults to the structural width. For `rr`, `n` is
required: it is how many tails may ring, which structure cannot know.

---

## 4. The bridge

### 4.1 Read

`seq(pattern, position)` reads `pattern` at `position`. When `position` is
omitted, it is the ambient clock's beat position.

Outputs:

- `out` (default) — the current event's value, held between events.
- `gate` — high while the position is inside a `note` or one of its ties.
  Between two touching notes, the gate dips for a fixed 1 ms so envelopes
  retrigger. When the position comes from a clock, the dip falls before the
  change, so gate and trig rise together. Otherwise it starts at the change.
- `trig` — a single-sample pulse when the position enters a different note.
  A tie belongs to its note: moving from a note into its own tie fires nothing;
  jumping onto a tie from anywhere else enters that note and fires. Direction
  and distance do not matter: a clock step, a reset, a backwards scan, and a
  random jump all fire once.
- one output per record field (§3.4).

This is how voltage-addressed sequencers have always worked: arriving at a new
stage fires its pulse, however you got there.

### 4.2 Positions

- `tempo(bpm)` sets the ambient clock and returns it. `clock(bpm)` makes another
  clock for polytempo. A clock's outputs: `out` (beat position), `beat` (trig),
  `bar` (trig per cycle). Tempo is an input, so tempo modulation is patching.
- `counter(trig, { reset, length })` counts triggers. Its output is a step
  position.
- Any signal is a position: `seq(p.steps(), lfo(0.1, 0, 8))` scans eight steps.

Read by steps with `.steps()`: the nth event, rests and ties included, spans
`[n, n+1)`. Stacks count per layer. `fast` and `slow` do nothing under steps;
`rev`, `euclid`, `every`, `?`, and `<a b>` keep their meaning.

### 4.3 Patterns as knobs

A pattern used where a signal is expected is read at the ambient clock: it
becomes `seq(pattern).out`. Before the first note it holds the value of the most
recent earlier event, found by querying backwards. A rest holds the last value.
A stack widens the module it feeds.

A stepped value into a continuous control clicks at each edge. `slew` declicks
it:

```js
lpf({ cutoff: slew(p`72 84 [96 60] <60 108>`, 0.01) })
```

### 4.4 Signals inside patterns

A pattern may carry signals as values. It becomes a switch that changes which
cable is live:

```js
const env = s.gate.ad(0.01, 0.3)
lpf({ cutoff: p`${lfo(0.3, 60, 96)} ${env.mul(36).add(60)} 80` })
```

This desugars to `mux(indexPattern, [palette])`. Rules:

- Every signal in the palette runs all the time, like modules in a rack.
- Combinators change **when** a signal is selected, never the signal itself:
  `fast(2)` switches twice as often; it cannot speed up an LFO.
- Only memoryless maps (`add`, `mul`, `clip`) apply to signal values, because
  they commute with switching. A stateful map (`slew`) on a pattern of signals
  is an error.
- Palette members have structural identity, so adding a step does not reset
  their state.

---

## 5. Modules

A module is a Mealy machine. The whole contract:

```js
defmod({
  name: "lpf",
  ins:    { in: sig(0), cutoff: semis(84), res: unit(0.2) },
  outs:   { out: sig() },
  config: { mode: "lp" },
  state:  (sr) => ({ ic1: 0, ic2: 0 }),
  helpers: { tanh },
  tick:   (s, i, o, c, sr) => { /* reads i, c; writes o and s */ },
})
```

- **`ins`/`outs`** declare names, defaults, and units with the same tags as
  §2 (`hz`, `semis`, `secs`, `beats`), plus `unit` (0..1) and `sig` (no unit).
  Units drive UI, errors, and conversion of tagged values.
- **`state`** runs once at eval. State is plain data: numbers, fixed-shape
  objects, typed arrays, fixed-size arrays of fixed-shape objects. This makes
  live state migration, inspection, and snapshots mechanical.
- **`tick`** runs per sample per lane. Reducers and reshapers declare a lane
  policy and receive lane arrays.
- **`helpers`** are named functions `tick` may call. They follow the same rules
  as `tick`.
- The first input is the default input (chain target). The first output is the
  default output, named `out` everywhere. Semantic names (`gate`, `trig`)
  appear only where they mean exactly that.
- A stereo module (`pan`) has outputs `l` and `r` and no default output.
  Chaining from it connects by name (§2); anything else is a loud error.

`defmod` is the only way to define a module. Built-in modules use it too. It is
scope-aware: at root scope it registers into the library; inside a patch it
registers for that patch only.

A module can instead be a **sub-patch**: `defmod({ name, ins, outs, patch:
(i) => ({ out: ... }) })`. It gets the same ports, chaining, positional args,
and identity as any module. This is saving a sub-patch as a module.

### 5.1 What `tick` may do

Everything whose shape is fixed when the patch starts. `state()` runs before
compiling, so the compiler sees the real shapes and needs no type guessing.

- Allowed: arithmetic, `Math.*` (bound to auxlang's own math, §7),
  `if`/`switch`/loops, locals, fixed-shape state
  objects and arrays, helpers (no recursion), config strings (resolved before
  the patch runs).
- Not allowed: creating objects or arrays, growing arrays or adding fields,
  computed property names, runtime strings, closures over patch variables.

A tick outside these rules is a loud error at eval, naming the line.

**Randomness.** `Math.random()` inside a tick is a seeded generator. Each
module instance and each lane gets its own stream from (seed, identity, lane).
The generator's position is module state, so re-eval carries it. For a value
that is the same every time a key comes back, use `hashRandom(key)`.

**Lambdas** `(s, sr, t) => n` are stateless modules and follow the same rules.

### 5.2 Modulation adds

A knob on a rack is a base value; each CV input adds to it through its own
depth. Auxlang ports work the same way:

```js
lpf({ cutoff: 60 })
  .mod("cutoff", lfo(0.3), 12)              // ± 12 semitones
  .mod("cutoff", s.gate.ad(0.01, 0.3), 36)  // + up to 36 semitones
```

Setting a port sets its base. Each `.mod(port, signal, depth = 1)` adds
`signal × depth`. Modulo is `wrap(by)`, so `mod` means modulation.

### 5.3 Controls

Controls are **boundary modules**, like MIDI input: signals that come from your
hands. Each draws an inline widget in the code.

| Control | Outputs | Rack analogy |
|---|---|---|
| `slider(value, min, max)` | `out` | a fader |
| `knob(value, min, max)` | `out` | a pot |
| `toggle(on)` | `out` (0/1) | a latching switch |
| `button()` | `out` (gate), `trig` | a manual gate button |
| `xy(x, y, min, max)` | `x`, `y` | an XY pad / joystick |

- Moving a control sends its value straight into the running engine. No
  re-eval.
- Moving a control **rewrites its value in the code**. The code always holds
  the current value, so a re-eval never jumps back.
- Output is smoothed by a short slew (10 ms default, `{ slew }` to change) so a
  sweep never zippers. `button` and `toggle` are not smoothed.
- Values clamp to `[min, max]`, in the unit of the port they feed.
- Identity is the control's place in the code, or `{ name }` when given.
  Rewriting its value does not change its identity.
- Every move is logged as input (§7).

**Any number is draggable.** A plain number in the code works like an endless
encoder: it nudges up or down from where it is, so it needs no range.

- The digit you grab sets the step: the tens digit of `440` moves by 10, the
  first decimal of `0.25` by 0.1. Shift is finer.
- The port's unit shapes the drag: a 0..1 port clamps, a gate snaps to 0/1, a
  semitone port steps by whole semitones, seconds and rates move by a
  percentage.
- The first drag re-evals once and turns that number into a live slot. State
  survives, because constants are not identity (§6.2). Later moves only write
  the slot and rewrite the code. The next ordinary eval bakes it again.

A range is needed only for absolute controls: `slider`, `knob`, `xy`, and
mapping a MIDI controller onto a value.

### 5.4 The oscillator family

`sin`/`saw`/`tri`/`sqr` share one input surface:

- `pitch` — semitones, default 69 (A4). The default input.
- `fm` — Hz, added to the frequency from `pitch` (linear FM).
- `min`/`max` — output range, default −1/1.
- `phase` — initial phase.

Positional args are `[pitch, min, max]`. `sin()` is A4. `sin(0)` is pitch 0,
about 8.18 Hz. An exact frequency is `sin(hz(440))`. Slow modulation uses
`lfo(freq, min, max)` with `{ shape }` in config.

### 5.5 Amplitude and envelopes

Amplitude is multiplication: `.mul(x)`. `gain` and `vca` are aliases. Envelopes
are gate-driven: `ad(attack, decay)` fires on the gate's rising edge,
`ar(attack, release)` follows the gate, `adsr(a, d, s, r)` is the full envelope.
Times are seconds or `beats(x)`.

---

## 6. The patch

A program is a JS expression. Module calls, chains, setters, and combinators
build **pure values**. Nothing exists, costs, or sounds until it reaches `out`.

```js
tempo(124)

const s = seq(p`c3 [e3 g3] <a2 b2> ~`.every(4, q => q.rev()))
s.saw()
  .lpf({ cutoff: s.add(24), res: 0.3 })
  .mod("cutoff", lfo(0.2), 12)
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.2))
  .out()
```

- **Value semantics.** `x.cutoff(800)` returns a new value. A discarded chain is
  garbage. Eval collects the `out` roots, prunes the rest, and compiles.
- **Effects.** `out()` marks a root. `tempo()` and `seed()` are **settings**.
  Settings bind when eval finishes, so their place in the code does not matter.
  Each setting appears at most once; a second one is an error. `defmod` inside
  a patch registers for that patch.
- **Binding** is `apply`: `clock(90).apply(c => ...)`. It is rarely needed.
- **Loud failure.** Unknown ports, unconnected required inputs, too many
  positional args, a tick outside §5.1, a dropped stereo channel: errors at
  eval, naming what was available. A live language never silently no-ops.

### 6.1 Feedback

Cycles are legal. A cycle passes through one explicit unit delay, written as
`loop`. The fed-back value arrives one sample late:

```js
// Karplus–Strong: a noise burst circulating in a delay tuned to the note
tempo(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008))
loop((fb) =>
  exciter.add(fb.delay({ time: s.period(), mix: 1 }).lpf({ cutoff: 98 }).mul(0.99)),
).gain(0.8).out()
```

`loop` can carry several wires as a record, for cross-coupled systems:

```js
loop({ a: 0, b: 0 }, (fb) => ({
  a: sin(57).mod("pitch", fb.b, 12),
  b: sin(64).mod("pitch", fb.a, 12),
})).apply((v) => v.a.add(v.b).gain(0.2).out())
```

`loop` is the fixpoint of the signal graph (ArrowLoop). In a rack, it is a cable
from an output back to an input.

### 6.2 Identity and live re-eval

Re-eval is the core interaction, so its rules are part of the language:

- The new graph is matched to the running one **structurally**: by module, by
  the identity of its inputs, and by order among duplicates. Matching nodes keep
  their state. `.id("bass")` pins identity when the structure changes.
- The clock position is continuous across evals. Patterns pick up mid-cycle.
- The old and new graphs crossfade equal-power over a short window.
- Module state is data (§5), so migration is copy-and-carry.
- A patch-defined module's source is part of its identity. A changed tick is a
  different machine, so its state resets unless pinned.
- A constant's value is not identity. Identity is module type, wiring, `.id()`
  pins, and state shape. Changing `lpf(800)` to `lpf(900)` keeps state; a change
  that alters state shape resets only that module.
- Control moves (§5.3) are not re-evals. They change a value and nothing else.

---

## 7. Determinism

A performance is a pure function of (timestamped code log, seed, input log).

- **Seed.** `seed(42)` pins the patch seed. Without it, the runtime draws a seed
  when play starts and keeps it across re-evals. The editor shows it, so a happy
  accident can be pinned. `.seed(n)` on a pattern or module sets a local seed.
- **Streams.** Every random element draws from (seed, identity, lane). Editing
  code above a module can change its identity and so its randomness; `.id()` or
  `.seed()` holds it.
- **The log.** Each eval is logged with the sample at which it took effect.
  Control moves, number drags, MIDI, and other live inputs are logged with the
  sample at which they arrive.
- **Math.** Auxlang ships its own `sin`, `exp`, `tanh`, and friends. Host math
  differs between engines; ours does not.

Consequences: audio and visuals agree; offline equals live, sample for sample;
a set replays exactly from its log.

**Seeking is not a language feature.** Patterns are pure functions of position,
so a patch can move a position anywhere: a reset, a scan, a jump. That is patch
logic. The whole patch is not seekable, because filters, delays, envelopes, and
feedback carry history. Tools that want to seek in a recording load a state
snapshot and render forward.

---

## 8. Compilation

Running a patch means compiling it. The design keeps everything static at eval
so the compiler can turn the whole patch into one function:

- width, the `mux` palette, `loop` wires, and settings are fixed at eval;
- module state shapes are known (§5.1);
- built-in and user modules share one contract and one compiler, so a user
  module is as fast as a built-in by construction.

Runtime obligations:

- **Sample-accurate, single-rate.** One tick per sample. Gates and trigs land on
  the exact sample. The compiled function runs a block of samples in one loop,
  with state in locals, without changing per-sample semantics.
- **No allocation on the audio thread.** Clock reads use flat event tables
  built one cycle ahead. A position with a known range (a counter's `length`,
  an LFO's min/max) gets tables for that range. Any other position uses a query
  path that does not allocate.
- **Controls are slots.** Plain numbers are baked in. Controls and dragged
  numbers are read from slots the editor writes.
- **Backends agree.** The JS backend is the reference. A WASM backend compiles
  the same tick subset with the same math, and must match it bit for bit.
- **Re-eval does not glitch.** A new program is compiled and warmed before the
  swap.
- **Mixing.** Reducers use equal-power laws. `out` applies 1/√n lane mixdown, a
  DC guard, and a peak safety clip.

---

## 9. What is deliberately absent

- **No unit type system.** The patch that "makes no sense" and sounds great is
  the point of modular.
- **No runtime voice allocation.** Lanes are assigned by `.voices()`, a pure
  pattern function. Width is static.
- **No event or message layer.** If it changes over time, it is a signal. If it
  is musical structure, it is a pattern.
- **No macro layer.** JS is the metaprogramming. Sub-patch modules (§5) give
  reuse a module's shape.
- **No inheritance.** Modules compose by patching.
- **No MIDI-first design.** MIDI in/out are modules at the boundary, like the
  controls (§5.3).
- **No whole-patch seeking** (§7).
- **No host randomness.** `Math.random` is always the seeded stream.

---

## 10. The instrument surface

The editor is part of the instrument. The code is the panel: it shows what is
moving, and you play it in place.

### 10.1 Source locations

Before eval, a rewrite step tags every module call, every number, and every
pattern token with its range in the code. Everything below rests on this.
Errors use it too: a loud failure points at the exact code.

### 10.2 What it shows

- **Pattern highlights.** A pattern token lights while its note sounds. Rests
  stay dark. A tie extends its note's light.
- **LED glow.** Every module call glows behind its text with the level of its
  default output, like the LED beside a jack.
  - Unipolar signals (gates, envelopes) set brightness. Bipolar signals use
    two colors, one for each sign, like a bipolar LED.
  - Audio-rate signals show their level, not the raw wave.
  - A trig flashes and fades, so a single-sample pulse is visible.
  - The glow sits behind the text and never lowers its contrast.
- **Exact values on hover.** Brightness shows motion and rough level; hovering
  a call shows its value.
- **The seed**, with a reroll button.

Flashing is capped for safety. Anything that would flash more than about three
times a second shows its steady average instead. The editor respects the
system's reduce-motion setting.

### 10.3 Where the truth comes from

The audio thread reports what actually played: each note a `seq` enters, with
its sample time, and a level summary of each shown output about 60 times a
second. The editor never recomputes this itself, because positions and tempo
are signals. It times each light to when the sound leaves the speakers, so
light and sound agree (§7).

### 10.4 What you play

Controls and draggable numbers (§5.3). Moving them rewrites the code and logs
the move; it never re-evals.

---

## 11. A closing patch

Everything at once: ambient tempo, pattern algebra, records, voices, additive
modulation, a live control, step reading, signals in patterns, stereo by name,
feedback.

```js
const t = tempo(126)
seed(7)

// pads: stable voices, cutoff keytracked and modulated, slow auto-pan
const pad = seq(p`[c3,e3,g3] <[a2,c3,e3] [f2,a2,c3]>`.slow(2).voices("stable", 3))
pad.saw()
  .lpf({ cutoff: pad.add(24), res: 0.2 })
  .mod("cutoff", lfo(0.1), 12)
  .mul(pad.gate.adsr(0.4, 0.3, 0.7, 1.2))
  .pan(lfo(0.05, -0.6, 0.6))
  .out()

// acid line: transformed hook, cutoff on a knob, envelope sweep, synced echo
const hook = p`c2 [c2 eb2] g1 <bb1 c2>`
const line = seq(hook.every(4, (q) => q.rev()).off(1 / 8, (q) => q.add(12).degrade(0.4)))
loop((fb) =>
  line.slew(0.03).saw()
    .lpf({ cutoff: knob(52, 36, 96), res: 0.85 })
    .mod("cutoff", line.gate.adsr(0.001, 0.12, 0, 0), 48)
    .mul(line.gate)
    .add(fb.delay({ time: beats(3 / 4), mix: 1 }).mul(0.35)),
).gain(0.5).out()

// arp: the hook read by steps, advanced by a comparator, reset each bar
const arp = seq(hook.add(24).steps(), counter(lfo(4).gt(0.8), { reset: t.bar }))
arp.tri()
  .lpf({ cutoff: p`${lfo(0.3, 72, 108)} 96` })
  .mul(arp.gate.ad(0.001, 0.1))
  .gain(0.2)
  .out()

// drums: euclidean kick, backbeat snare, hats with per-step velocity
seq(p`60(4,8)`).trig.kick().out()
seq(p`~ 60 ~ 60`).trig.snare().out()
const hats = seq(p`60*16?0.3`.with({ vel: p`1 0.6 0.8 0.5` }))
hats.trig.hihat().mul(hats.vel).gain(0.8).out()
```

Every line is the same language: patterns are values, signals are values, and
the bridge between them is a cable carrying a position.
