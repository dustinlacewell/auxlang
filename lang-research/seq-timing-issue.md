# Sequencer Timing Issue - Groups & Subdivisions

## The Problem

The sequencer needs to support **groups** like `[c4 e4]` which subdivide time - two notes play in the space of one beat. This requires the sequencer to know the beat length and internally track sub-beat timing.

## Current Implementation Approach

The sequencer uses **time-based positioning** rather than simple step counting:

1. **Measure beat length**: Track samples between trigger rising edges
2. **Calculate phase**: `phase = samplesSinceTrig / samplesPerBeat` (0 to 1 within beat)
3. **Track total time**: `totalTime = patternTime + phase`
4. **Find step by duration**: Walk pattern, accumulating `dur` until we find which step we're in

This allows subdivided steps (dur < 1) to play multiple times within a single beat.

## The Fundamental Tension

There's a conflict between:

1. **Unit tests**: Call `process()` with single samples, no real time passing. Expect:
   - First call with `trig:0` → output first note
   - First call with `trig:1` → advance to second note

2. **Real audio**: Thousands of samples per beat, time-based subdivision needed

## Current Bug

When `patternTime` starts at -1 (so first trigger brings it to 0), the calculation goes wrong:
- Before any trigger: `patternTime=-1`, `phase=tiny`, `totalTime≈-1`
- Negative totalTime causes issues with modulo pattern wrapping

When `patternTime` starts at 0:
- First trigger: `patternTime` goes 0→1 immediately
- We skip beat 0 entirely, starting at beat 1

## Possible Solutions

### Option A: Separate modes for unit tests vs real audio
- Not ideal, tests should reflect real behavior

### Option B: Use "initialized" flag
- First call outputs step 0 without advancing
- First trigger advances to step 1
- Subsequent triggers continue normally

### Option C: Rethink the timing model
- Maybe `patternTime` should represent "start of current beat" not "beats completed"
- First trigger sets patternTime=0, phase runs 0→1, next trigger sets patternTime=1

### Option D: Pre-trigger initialization
- Before first trigger, output step 0 based on initial CV lookup
- Track whether we've received our first trigger yet
- Only start time-based calculation after first trigger

## Key Code Location

`src/devices/seq/seq.ts` - the `process()` function

## Test Expectations (from seq.test.ts)

The tests expect a **trigger-advance** model, not a **trigger-start** model:

```javascript
// Initial call with no trigger should output first note (C4)
process({ trig: 0, gateIn: 0 }) → cv ≈ 261.63 (step 0)

// First trigger ADVANCES to second note (E4), not starts at first
process({ trig: 0, gateIn: 1 }) → cv = C4 (still step 0)
process({ trig: 1, gateIn: 1 }) → cv = E4 (step 1!)

// This means: before first trigger = step 0, after first trigger = step 1

// Sustained trigger should NOT advance
process({ trig: 1, gateIn: 1 }) // sustained, no edge
→ cv should stay same

// Rest steps suppress gate
pattern "c4 ~"
step 0 (note) with gateIn=1 → gate=1
step 1 (rest) with gateIn=1 → gate=0
```

## The Key Insight

The original tests assume:
- **No trigger yet**: output step 0
- **First trigger**: advance to step 1
- **Second trigger**: advance to step 2
- etc.

NOT:
- **No trigger yet**: output step 0
- **First trigger**: start playback at step 0
- **Second trigger**: advance to step 1

This is the "traditional sequencer" model where the clock advances the sequence, vs. a "play button" model.

## Pattern Duration Examples

Pattern `"c4 e4 g4"`:
- 3 steps, dur=1 each
- Total duration = 3 beats

Pattern `"c4*4 e4 g4*2 c5"`:
- c4 (dur=0.25) × 4 = 1 beat
- e4 (dur=1.0) = 1 beat
- g4 (dur=0.5) × 2 = 1 beat
- c5 (dur=1.0) = 1 beat
- Total = 4 beats

Within beat 0 (time 0-1), we should hear c4 four times at t=0, 0.25, 0.5, 0.75.

## What Works Currently

- Groups `[]` subdivide correctly during real audio playback
- Phase tracking and beat measurement work
- Gate duty cycle for subdivided notes (80% on)

## What's Broken

- Unit tests fail because the initial state / first-trigger logic is wrong
- Starting `patternTime` at 0 skips first beat
- Starting `patternTime` at -1 causes wrong initial output

## Next Steps

Need to implement Option B or D - track initialization state separately from time tracking.
