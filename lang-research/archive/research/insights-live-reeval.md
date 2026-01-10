# Insights: Live Re-evaluation in Music Systems

Research notes from investigating how live-coding music systems handle seamless code changes.

## Systems Studied

### Strudel (Query-Based)
- Patterns are pure functions: `(timespan) → events[]`
- No state to migrate - patterns compute answers fresh
- Scheduler queries patterns, triggers audio on onsets
- Re-eval just swaps the pattern function

### Kabelsalat (Crossfade-Based)
- Multiple graphs can run simultaneously
- New graph fades in while old graph fades out
- Each graph is independent - no state sharing
- Simple and robust

## Key Insight: Modular Approach

The breakthrough for our implementation: **treat this like a modular synth, not a DAW**.

In a real eurorack:
- Twisting a filter knob → filter changes immediately
- Changing oscillator waveform → happens immediately
- Reprogramming a sequencer → sequencer decides how to handle it

The sequencer is the only module that has opinions about timing. Everything else is "live".

## What We Implemented

### Rejected: Global Transport
Originally considered a global phasor/transport that all clocks would read. Rejected because:
- Violates modular philosophy (multiple independent clocks should work)
- Adds complexity for unclear benefit
- BPM isn't inherently global

### Adopted: Device-Level Transitions
Each device handles its own config changes:
- **seq**: Queues pattern changes, applies on next beat
- **clock**: State preserved, BPM changes immediately
- **everything else**: State preserved, crossfade smooths audio

### Adopted: Topology Matching
Identify corresponding nodes between old and new graphs by:
- Device type (process function)
- Connection structure (input sources)
- NOT config (pattern, BPM, cutoff, etc.)

This allows state transfer even when parameters change.

### Adopted: Audio Crossfade
100ms linear crossfade between old and new graph outputs:
- Masks any discontinuities
- Works regardless of what changed
- Simple and reliable

## Open Questions for Future

1. **Should crossfade be user-configurable?** Some might want faster/slower.

2. **Per-device fade behavior?** Currently all devices crossfade together. Could seq hold its note while filter change is instant?

3. **Multiple simultaneous graphs?** Currently max 2 (old fading out, new fading in). Could support more for rapid re-evals.

4. **Non-seq pattern devices?** If we add other sequencer types, they'd need similar pattern-queuing logic.
