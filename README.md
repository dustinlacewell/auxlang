# Auxlang

Auxlang is a JavaScript-embedded language for making audio. It joins two time
models under one bridge: patterns (discrete, cycle-based step sequences, in
Tidal/Strudel-style mini-notation) and signals (continuous, sample-based DSP
modules wired into a graph). A sequencer reads a pattern and emits signals, so
any knob can be driven by a pattern and any pattern can be used as a signal.

```js
tempo(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
```

## Quick start

```
pnpm install
pnpm dev
```

## Learn more

- `MANIFESTO.md` — the design vision and the five concepts.
- `/guide.html` on the dev server — the language guide, with runnable examples.
- `packages/engine/docs/internals.md` — the compilation pipeline and runtime.

## License

AGPL-3.0-or-later. See `LICENSE`.
