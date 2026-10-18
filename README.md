# Auxlang

Auxlang is a JavaScript-embedded language for making audio that unifies two time
domains under one bridge. The *pattern calculus* is discrete, cycle-based, and
rational-time: patterns are pure, transformable values written in Tidal/Strudel-style
mini-notation, with a total desugaring to combinators. The *signal calculus* is
continuous and sample-based: modules are pure state machines wired into a graph in
which feedback is legal. The *bridge* is that a clock is a signal (a position ramp in bars)
and a sequencer is a module that reads a pattern at that position and emits
value/gate/trig signals, which go anywhere any signal goes. Any knob is patternable;
any pattern is a signal. See `MANIFESTO.md` for the full argument.

## Quick start

```
pnpm install
pnpm dev
```

The dev server serves the site:

- `/` (`index.html`) — landing: what auxlang is, the hello patch, runnable.
- `/editor.html` — the live editor (editor). Edit a patch, hear it,
  re-evaluate live.
- `/guide.html` — how to write patches, with runnable examples.
- `/patterns.html` — pattern and mini-notation documentation, with runnable
  examples of every notation form and combinator.
- `/modules.html` — module demos: every module with default, all-params,
  modulated, and showcase examples.

(`/core2.html` is the retired previous engine, unlisted.)

## Hello patch

```js
tempo(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
```

`tempo(120)` sets the ambient tempo. One pattern cycle is one bar. `seq("...")`
sequences a mini-notation pattern, where `<b2 a2>` alternates per cycle. `s.tri()`
chains a triangle oscillator from the sequencer's value; `.lpf` filters it, `.mul(s.gate.adsr(...))` shapes amplitude
with a gate-driven envelope, `.gain(0.3)` scales the result, and `.out()` sends it to
the master — the only effect in the language.

`tempo`, `out`, `loop`, and `p` are builders. Module factories such as `tri`, `saw`,
`sin`, `lpf`, `adsr`, `mul`, `gain`, `delay`, `pan`, `seq`, `clock`, and `counter` come from a
registry. `.gain` and `.vca` are aliases of `.mul`.

## Learn more

- `MANIFESTO.md` — the design vision and the five concepts.
- `docs/user-guide.md` — the systematic language guide.
- `packages/engine/docs/internals.md` — the compilation pipeline and runtime.
