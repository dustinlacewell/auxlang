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

**Mono/Uzu refactor** - Simplifying polyphony model.

See the plans:
- [plans/polyphony-decomposition.md](../plans/polyphony-decomposition.md) - Compile-time graph duplication
- [plans/uzu-design.md](../plans/uzu-design.md) - Overall architecture vision

### Key Insight

Polyphonic patterns decompose into N mono seqs at parse time. Downstream devices duplicate per-voice. No runtime voice tracking needed.

```javascript
seq("{c4,e4,g4}").saw()  // Creates poly of 3 saws, each mono
```

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
