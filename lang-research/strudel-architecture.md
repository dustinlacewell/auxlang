# Strudel Architecture Research

## Overview

Strudel is a JavaScript port of TidalCycles, licensed under **AGPL-3.0-or-later**. It's a monorepo using pnpm workspaces with ~30 packages.

## License: AGPL-3.0-or-later

The AGPL license means:
- Any derivative work must also be AGPL
- Network use (web apps) triggers copyleft - must provide source
- Cannot be used in proprietary/closed-source applications like Steam games

## Core Architecture

### 1. Pattern System (`@strudel/core`)

**Files**: `pattern.mjs` (111KB), `hap.mjs`, `timespan.mjs`, `fraction.mjs`

The heart of Strudel is the `Pattern` class - a functional reactive pattern representation.

```
Pattern = query function: State -> Hap[]
```

Key concepts:
- **Pattern**: A function that takes a time span (State) and returns events (Haps)
- **Hap**: An event with `whole` (logical time), `part` (actual time), and `value`
- **TimeSpan**: A time interval represented with Fractions for precise timing
- **Fraction**: Arbitrary precision rational numbers for cycle-accurate timing

The pattern system implements:
- Haskell-style functor/applicative/monad operations (`fmap`, `appBoth`, `appLeft`, `appRight`)
- Pattern combinators (`stack`, `cat`, `fastcat`, `slowcat`)
- Time manipulation (`fast`, `slow`, `early`, `late`)
- Structure operations (`euclid`, `struct`, `mask`)

**Critical insight**: The pattern abstraction is the most valuable IP. It's a specific mathematical model derived from TidalCycles research.

### 2. Mini Notation Parser (`@strudel/mini`)

**Files**: `krill.pegjs` (PEG grammar), `krill-parser.js` (generated), `mini.mjs`

Uses **Peggy** (MIT licensed parser generator) to parse mini notation.

Mini notation examples:
- `"bd sd"` - kick and snare in sequence
- `"bd [sd hh]"` - nested subdivision
- `"bd*4"` - repeat 4 times
- `"bd?"` - randomly degrade
- `"<bd sd hh>"` - slow sequence (one per cycle)

The grammar defines:
- Steps, sequences, stacks, polymeter
- Operators: `*` (fast), `/` (slow), `!` (replicate), `?` (degrade), `@` (weight)
- Euclidean rhythms: `(3,8)` syntax

### 3. Transpiler (`@strudel/transpiler`)

**Dependencies**: `acorn` (MIT), `escodegen` (BSD), `estree-walker` (MIT)

Transforms user code (syntactically valid but semantically enhanced JS) into evaluatable Strudel code:
- Wraps strings in `m()` calls (mini notation)
- Handles template literals for different languages
- Adds location tracking for editor integration
- Supports widgets (sliders, etc.)

### 4. Audio Engine (`superdough`)

**Files**: `superdough.mjs`, `synth.mjs`, `sampler.mjs`, `worklets.mjs`

Web Audio API based synth/sampler inspired by SuperDirt:
- AudioWorklet-based synthesis
- Sample playback with pitch/time manipulation
- Effects chain (filter, reverb, delay, distortion)
- Multi-channel/orbit support

Key components:
- Sound registration system (`registerSound`)
- Polyphony management
- Effect sends and routing

### 5. Scheduler (`cyclist.mjs`, `zyklus.mjs`)

Clock-based event scheduling:
- Queries pattern for upcoming events
- Schedules triggers with latency compensation
- CPS (cycles per second) tempo control
- Uses `setInterval`/`setTimeout` or worker-based timing

### 6. Visuals (`@strudel/draw`, `@strudel/hydra`)

- **draw**: Canvas-based piano roll, spiral, pitchwheel visualizations
- **hydra**: Integration with `hydra-synth` (AGPL licensed!)

## Dependencies Analysis

### MIT/BSD Licensed (Safe):
- `acorn` - JS parser
- `escodegen` - Code generator
- `estree-walker` - AST walker
- `peggy` - Parser generator
- `nanostores` - State management
- `vite` - Build tool

### AGPL Licensed (Problematic):
- `hydra-synth` - Visual synth (1.3.29)

### Workspace Dependencies:
All `@strudel/*` packages are AGPL

## What Would Need Reimplementation

### Must Rewrite (AGPL contaminated):
1. **Pattern system** - Core abstraction, fundamental algorithms
2. **Mini notation grammar** - The specific syntax choices
3. **Audio engine** - superdough implementation
4. **Scheduler** - Cyclist/zyklus timing system

### Can Potentially Reuse Concepts:
- The general idea of "pattern as function from time to events"
- Euclidean rhythm algorithms (public domain math)
- Standard audio DSP (filters, oscillators)

### External Tools (MIT - usable):
- Peggy for parser generation
- Acorn for JS parsing
- Web Audio API (browser standard)

## Key Insights for Clean-Room Implementation

1. **Pattern abstraction**: Could design differently (e.g., push-based instead of pull-based)
2. **Mini notation**: Could create entirely new syntax
3. **Audio**: Web Audio API is standard, just need different architecture
4. **Timing**: Can use different scheduling approaches (AudioWorklet, SharedArrayBuffer)

## Estimated Complexity

| Component | LOC | Difficulty | Notes |
|-----------|-----|------------|-------|
| Pattern core | ~3000 | High | Mathematical/conceptual |
| Mini parser | ~800 | Medium | Peggy makes this easier |
| Transpiler | ~400 | Low | Standard AST manipulation |
| Audio engine | ~2000 | Medium | Well-understood domain |
| Scheduler | ~300 | Medium | Tricky timing issues |
| Visuals | ~1500 | Medium | Depends on approach |
