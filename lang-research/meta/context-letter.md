# Auxlang Context

Live-coding language for audio (and eventually visuals). Target: Steam game.

## Run It

```bash
cd auxlang && pnpm dev
```

## What's Working

- Descriptor system with lazy evaluation and full typing
- AudioWorklet runtime with WASM support
- Mini-notation sequencer with polyphony, probability, ties
- Live re-evaluation with state preservation
- Devices: oscillators, drums, filters, envelopes, reverb, delay

## Current Focus

See [current-task.md](current-task.md)

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

68 decisions in [decisions-made.md](decisions-made.md). Key ones:
- D007: Eurorack metaphor
- D034: All signals are PolySignal
- D053-D058: Voice creation model
- D067: Stateful AST traversal

## Next Up

Features for "coastline" port: samples, chords, voicing, mask/mute.

See [possible-tasks.md](possible-tasks.md) for backlog.
