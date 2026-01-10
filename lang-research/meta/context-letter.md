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

**Major refactor in progress: eliminating runtime polyphony in favor of compile-time graph duplication.**

See the plans:
- [plans/polyphony-decomposition.md](../plans/polyphony-decomposition.md) - The mono refactor
- [plans/uzu-design.md](../plans/uzu-design.md) - Overall architecture vision
- [plans/core-cleanup.md](../plans/core-cleanup.md) - Concrete cleanup tasks

### What We're Doing

Auxlang currently uses `PolySignal` (`{id, value}[]`) to track voice identity at runtime. Every device must iterate voices, key state by ID, etc. This is complex.

KabelSalat (Felix's livecoding synth) uses compile-time graph duplication instead - polyphonic patterns expand to N separate mono signal chains. Devices are simple (mono in, mono out).

**We're moving to the KabelSalat model:**

1. Decompose polyphonic seq patterns into N mono ASTs at parse time
2. Duplicate downstream graph for each voice
3. Mix collapses voices to stereo at the end
4. All devices become mono - no voice iteration

### Why This Order

Mono refactor first, then Uzu (the chaining syntax). The signal type affects everything else.

### Key Insight

Polyrhythm works correctly with decomposition:
```
{c4 d4 e4, g3 a3}  // 3-against-2
```
Each voice becomes independent seq with own loop length. They phase naturally.

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

68 decisions in [decisions-made.md](decisions-made.md). Note: D034 (all signals are PolySignal) is being revisited by the mono refactor.
