# Auxlang Context

Live-coding language for audio. Target: Steam game.

## Run It

```bash
cd auxlang && pnpm dev
```

Open http://localhost:5173/test-suite - click Play on any test.

## What's Working

- **core2**: New plain-data graph architecture (all 177 tests pass)
- Fluent chaining API: `seq("c4 e4").saw().lpf({ cutoff: 800 }).out()`
- AudioWorklet runtime with WASM support (filter, reverb, tape delay)
- Mini-notation sequencer with polyphony, probability, ties, euclidean
- Live re-evaluation with state preservation
- Devices: oscillators, drums, filters, envelopes, reverb, delay
- Device expand hooks for compile-time poly (seq, chord, spread)

## Quick Reference

See `.claude/rules/auxlang-guide.md` for API reference.

## Architecture

core2 produces plain JSON graphs:
```javascript
{
  nodes: [
    { id: 'saw1', device: 'saw', inputs: { freq: 440 }, config: {} },
    { id: 'lpf1', device: 'lpf', inputs: { input: { ref: 'saw1', out: 'audio' } }, config: {} }
  ],
  output: 'lpf1'
}
```

Key directories:
| Area | Location |
|------|----------|
| core2 devices | `src/core2/devices/` |
| core2 API | `src/core2/api.ts` |
| Wrap system | `src/core2/wrap/` |
| Runtime | `src/core2/runtime/` |
| v1 (legacy) | `src/devices/`, `src/descriptor/` |
| WASM source | `native/assembly/` |
| Test cases | `src/tests/interactive/` |

## Docs

- [docs/audio-model.md](../../docs/audio-model.md) - eurorack metaphor
- [docs/sequencer.md](../../docs/sequencer.md) - mini-notation
- [docs/live-reeval.md](../../docs/live-reeval.md) - hot code swap
- [docs/wasm-devices.md](../../docs/wasm-devices.md) - native DSP

## Decisions

See [decisions-made.md](decisions-made.md) for architectural decisions.
