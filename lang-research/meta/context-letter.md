# Auxlang Context

Live-coding language for audio (and eventually visuals). Target: Steam game.

## Run It

```bash
cd auxlang && pnpm dev
```

## What's Working

- Descriptor system with lazy evaluation and full typing
- Fluent chaining API: `seq("c4 e4").saw().lpf({ cutoff: 800 }).out()`
- AudioWorklet runtime with WASM support (filter, reverb, tape delay)
- Mini-notation sequencer with polyphony, probability, ties, euclidean
- Live re-evaluation with seamless state preservation
- Devices: oscillators, drums, filters, envelopes, reverb, delay

## Quick Reference

See `.claude/rules/auxlang-guide.md` for complete API reference covering:
- Core concepts (signals, descriptors, devices)
- Pattern syntax (mini-notation DSL)
- JavaScript API (instantiation, chaining, output access)
- Polyphony (pattern-level and JS-level)

## Current Focus

**Inline Signal Lambdas** - Any device input accepts `(state, sr, time) => number`:

```javascript
// Time parameter for simple time-based modulation
saw(220).lpf({
  cutoff: (s, sr, t) => Math.sin(t * 2 * Math.PI * 2) * 800 + 1000
}).out()

// Cyclic ramp using modulo
saw((s, sr, t) => {
  const cycleT = t % 2  // Reset every 2 seconds
  return 200 + (cycleT / 2) * 600
}).out()
```

- `state` - persistent object per input (survives across samples and re-eval)
- `sampleRate` - typically 44100 or 48000
- `time` - seconds since eval started (preserved across re-eval via `sampleCount`)

## Key Files

| Area | Location |
|------|----------|
| Devices | `src/devices/` |
| Sequencer | `src/devices/seq/` |
| Descriptor system | `src/descriptor/` |
| Graph compilation | `src/graph/` |
| Worklet runtime | `src/runtime/` |
| WASM source | `native/assembly/` |
| Test cases | `src/ui/test-suite/cases/` |

## Docs

- [docs/audio-model.md](../../docs/audio-model.md) - eurorack metaphor, signal flow
- [docs/sequencer.md](../../docs/sequencer.md) - mini-notation, polyphony
- [docs/descriptors.md](../../docs/descriptors.md) - lazy evaluation system
- [docs/live-reeval.md](../../docs/live-reeval.md) - hot code swap
- [docs/wasm-devices.md](../../docs/wasm-devices.md) - native DSP

## Decisions

83 decisions in [decisions-made.md](decisions-made.md). Recent: D082 (WASM state serialization), D083 (gain.level rename).
