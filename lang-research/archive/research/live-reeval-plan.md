# Live Re-evaluation Implementation

## Status: Implemented

Live re-evaluation is now working in auxlang.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WORKLET RUNTIME                      │
│                                                         │
│  On setGraph:                                           │
│    1. Topology-match old nodes → new nodes              │
│    2. Transfer state to matched nodes                   │
│    3. Start 100ms crossfade: old graph → new graph      │
│                                                         │
│  Each sample:                                           │
│    - Process new graph                                  │
│    - If crossfading: process old graph, mix by fade     │
│    - Seq handles own pattern transitions (next beat)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. No Global Transport

We rejected global transport/phasor. Reasons:
- Multiple independent clocks should be possible (eurorack philosophy)
- BPM is not a global concept - each clock has its own rate
- Simpler to let each device handle its own state

### 2. Topology-Based Node Matching

Nodes are identified by device type + connection structure (not config).
This means:
- `clock(120)` matches `clock(180)` - state transferred, BPM changes
- `seq("a b")` matches `seq("x y")` - state transferred, pattern queued
- `saw(freq)` matches `saw(freq)` - phase preserved

### 3. Devices Handle Own Transitions

Instead of runtime detecting "beat boundaries", each device decides how to handle config changes:

- **seq**: Detects pattern change, queues new pattern, applies on next beat (trigger rising edge)
- **clock**: State transferred directly, new BPM takes effect immediately
- **osc/filter/etc**: State transferred, crossfade handles audio smoothing

### 4. 100ms Linear Crossfade

Runtime crossfades audio output when graphs swap:
- Old graph fades out, new graph fades in
- Masks any remaining discontinuities
- Long enough to sound smooth, short enough to be responsive

## Implementation Files

- `src/runtime/processor.ts` - Graph swap, crossfade, state transfer
- `src/devices/seq/seq.ts` - Pattern change detection and queuing
- `src/graph/diff/topology-hash.ts` - Node identity hashing
- `src/graph/diff/diff.ts` - Graph comparison
- `src/ui/audio/use-audio-player.ts` - Reuses AudioContext on re-eval

## Test Page

`/live-reeval.html` - Interactive tests for various re-eval scenarios
