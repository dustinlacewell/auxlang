# Auxlang Quick Reference (core3)

A patch is a JS expression building pure values; nothing sounds until `out()`
(the only effect). `clock(120)` sets the ambient tempo. Chains read left→right.

```js
clock(120)
const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .lpf({ cutoff: 900, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
```

## Modules (real signatures)

- **Osc** `osc/sin/saw/tri/sqr` — ins `pitch`(semis, def 69, DEFAULT), `freq`(hz,
  optional, WINS when set), `min/max`(range -1/1), `phase`. Positional `[freq,min,max]`
  → `sin(0.3,100,800)` is an LFO. `sin(0)` = freq 0 = SILENCE; use `sin()` or `sin({pitch:60})`.
- **Filters** `lpf/hpf/bpf/notch` — `{cutoff, res}`, positional `[cutoff, res]`.
- **Env** `ad(a,d)` · `ar(a,r)` · `adsr(a,d,s,r)` — gate-driven. NO `env` module.
- **Amp/math** `mul` (aliases `gain`, `vca`) · `add(to)` · `sub(from)` · `div(by)` ·
  `mod(by)` (MODULO) · `abs` · `clip(min,max)` · `scale(min,max,from,to)` · `slew(rise,fall)` ·
  `sah(trig)` · `quantize({scaleName, root, octave, range})`.
- **Compare** `gt(than)` · `lt` · `eq` — emit 0/1 gates.
- **FX** `delay({time,feedback,mix})` (secs) · `pan(pos)` → outputs `l`/`r`.
- **Drums** `kick/snare/hihat/clap` — default input `trig`.
- **Bridge** `clock(bpm)` · `seq(pattern)` · `patstep(pattern, trig)` · `patsig` (auto).
- **Reduce/out** `mix` · `out`.

## seq taps

`seq(pat)` node. `.pitch`(default out, semis, S&H) · `.gate`(1 while sounding, ~1ms
pre-release gap) · `.trig`(single-sample onset). Chaining `seq(...).tri()` chains from pitch.
Drums: `seq(p\`60(3,8)\`).trig.kick()`.

## Pattern syntax (string in `seq("...")` or `p\`...\`` for combinators)

```
c3 e3   sequence     ~      rest        [a b]  subdivide step
<a b>   alt/cycle     {a,b}  stack(poly) a*2    repeat in step
a!2     replicate     a@2    hold/weight a _ b  tie/legato
a?  a?.75  maybe      a(3,8)  a(3,8,2)  euclid(+rot)
```
Notes MIDI: `c4`=60, `c3`=48, `#`/`b`. Bare numbers are MIDI semitones.

### Combinators (methods on `p\`...\``)

| method | effect | | method | effect |
|---|---|---|---|---|
| `.fast(n)`/`.slow(n)` | scale time | | `.iter(n)` | rotate start/cycle |
| `.rev()` | reverse in cycle | | `.ply(n)` | repeat each event |
| `.early(a)`/`.late(a)` | rotate | | `.euclid(k,st,rot)` | euclid mask |
| `.every(n, q=>...)` | transform every nth | | `.degrade(p)` | seeded drop |
| `.add(semis)`/`.mul(f)` | payload arith | | `.off(amt, q=>...)` | overlay shifted copy |

Statics: `P.stack`, `P.cat`, `P.fastcat`. Splice: `p\`\${hook} \${hook.rev().add(12)}\``.
`?`/`degrade` are seeded (hash of seed+path+cycle) — deterministic, scrub-safe.

## Modulation

Any input takes number | output | lambda `(s,sr,t)=>n` | pattern. LFO = slow osc into
a knob: `sin(0.3, 300, 2000)`. **Pattern-as-signal**: `p\`...\`` into any knob lifts
automatically. It STEPS (clicks into a cutoff) — declick with
`slew({ in: p\`400 800 1600\`, rise: 5e-6, fall: 5e-6 })`. Drive pitch directly:
`tri(p\`48 55 60 63\`)`.

## Feedback

`loop(fb => ...)` — `fb` is the output one sample late (a `z1` unit delay). Echoes,
filter pinging, Karplus-Strong.

## Stereo (two-cable, no auto-spread)

Mono `.out()` auto-centers. For placement: `x.pan(pos).apply(v => out({ l: v.l, r: v.r }))`.
A bare `.out()` off a stereo source (pan) is a LOUD ERROR (drops a channel).

## patstep (trigger domain)

`patstep(pattern, trigSignal)` advances onset values per rising trigger, IGNORING
durations. Any trigger: `s.trig`, `sin(6).gt(0.7)`.

## Key gotchas

1. `sin(0)` = freq 0 = silence. Default A4 is `sin()`.
2. Stereo needs explicit `out({ l, r })`; bare `.out()` off pan throws.
3. `seq` uses the ambient `clock(...)`; no clock ⇒ unclocked.
4. `mod` is modulo; `factory(name)` is the module-lookup helper, not musical.
5. Value semantics: setters COPY; a chain that never hits `out()` is pruned.
6. Chaining + setting the default input errors: `seq.pitch.saw({freq:880})` (freq
   is bound by the chain) — use a non-default port.
7. Loud failure everywhere: unknown ports/modules, unconnected required inputs,
   notation parse errors — all throw at eval, naming what was available.
