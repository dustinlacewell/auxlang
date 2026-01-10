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

**Inline Signal Lambdas** - Just implemented. Any device input accepts `(state, sr) => number`:

```javascript
saw(220).lpf({
  cutoff: (s, sr) => {
    s.phase = ((s.phase ?? 0) + 2 / sr) % 1
    return Math.sin(s.phase * Math.PI * 2) * 800 + 1000
  }
}).out()
```

Lambda state is properly preserved across re-eval via `CollectedStates.lambdaStates` map (keyed by `nodeId:inputName`).

### Next: Add sampleTime parameter

Devices and lambdas currently only get `sampleRate`. They should also get `sampleTime` (samples since eval started) so they don't need to manually track time:

```javascript
// Current - manual time tracking
(s, sr) => {
  s.t = (s.t ?? 0) + 1 / sr
  return Math.sin(s.t * 2 * Math.PI)
}

// Proposed - sampleTime provided
(s, sr, t) => Math.sin(t * 2 * Math.PI)
```

**Changes needed:**
1. `ProcessFn` signature: add 5th param `sampleTime: number`
2. `SignalLambda` signature: add 3rd param `sampleTime: number`
3. `RuntimeGraph`: track `sampleCount`, pass to process/lambda calls
4. State restoration should preserve `sampleCount` for continuity

**Files:**
- `src/descriptor/types.ts` - ProcessFn, SignalLambda types
- `src/runtime/processor/runtime-graph.ts` - track and pass sampleTime
- `src/runtime/processor/hydrate.ts` - update process call
- Test cases that use time tracking can be simplified

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
