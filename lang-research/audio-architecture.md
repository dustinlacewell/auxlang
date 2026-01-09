# Audio Architecture: Discrete + Continuous

## Problem Statement

Strudel's pattern model produces discrete events. Continuous parameter changes (ramps, LFOs, smooth envelopes) require workarounds like `segment()`. Users cannot easily express crescendos, filter sweeps, or vibrato.

## Requirements (from feature survey)

The audio system must express:

### From Strudel (Discrete)
- Sequential events: `a b c` in time
- Parallel layers: multiple voices simultaneously
- Subdivision: divide time into parts
- Repetition/speed: faster, slower, repeated
- Euclidean rhythms: `(pulses, steps, rotation)`
- Random selection: choose from options
- Conditional application: apply transformation sometimes

### From Punctual (Continuous)
- Oscillators: sine, saw, tri, square at arbitrary frequency
- LFOs: low-frequency modulation sources
- Math: full arithmetic on signals
- Range mapping: scale values between ranges
- Filters: lpf, hpf, bpf with continuous cutoff/resonance

### Missing from Both (the gap)
- Smooth parameter transitions over pattern events
- Envelopes triggered by events but evolving continuously
- Ramps/crescendos spanning multiple events
- Per-voice continuous modulation

## Core Question

How do discrete events and continuous signals interact?

### Option A: Signals are sampled at event times
Pattern events query signal values when they fire. Signal provides the value, pattern provides the timing.

### Option B: Events trigger signal generators
Pattern events start/stop/retrigger continuous processes (envelopes, ramps).

### Option C: Signals and events are separate but routable
Two parallel systems. Events go to a scheduler, signals go to audio graph. Routing connects them.

### Option D: Unified model with dual interpretation
One abstraction that can be queried discretely or continuously depending on context.

## Analysis Needed

Before designing syntax, need to answer:

1. What is the fundamental abstraction? (Pattern? Signal? Something new?)
2. What are the primitive operations on that abstraction?
3. How do operations compose?
4. What are the evaluation semantics? (when does computation happen?)
5. How does time work? (cycles? seconds? samples? beats?)

## Next Step

Formalize the semantic model before any syntax design.
