# Auxlang Quick Reference

## Sequencer Pattern Syntax

```
c4        note
~         rest
c4*4      hold 4 steps
c4,e4,g4  chord (polyphony)
c4_e4     legato/glide
[c4 d4]   subdivide
<c4 d4>   alternate each loop
f#4 bb3   sharps/flats
```

## Signal Flow

```
clock → seq → osc → filter → mult(by env) → effects → out
```

## Chords

Use comma syntax for polyphony - do NOT use separate sequencers:
```javascript
seq("c4,e4,g4 ~ a3,c4,e4")  // correct
```

## Devices

- **Osc**: `saw`, `osc`, `sqr`, `tri`, `noise`
- **Env**: `adsr(gate)`, `env(gate)`
- **Filter**: `lpf`, `hpf`, `bpf`, `notch` + `.cutoff()`, `.resonance()`
- **Math**: `mult(x).by(y)`, `add(x).to(y)`, `gain(x).amount()`
- **FX**: `delay`, `tape`, `reverb`

See `src/ui/test-suite/cases/` for examples.
