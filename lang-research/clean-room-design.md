# Clean-Room "Uzulang" Design Considerations

## Overview

This document outlines design considerations for a new live-coding language ("uzulang") for audio and visuals, implemented from scratch without AGPL/GPL contamination.

## Design Space Analysis

### Paradigm Choice: Events vs Signals vs Hybrid

| Approach | Pros | Cons | Examples |
|----------|------|------|----------|
| **Event/Pattern** | Good for rhythm, sequencing | Less natural for continuous | Strudel, TidalCycles |
| **Signal/Continuous** | Natural for synthesis, visuals | Hard to do precise rhythm | Punctual, Faust |
| **Hybrid** | Best of both worlds | More complex | SuperCollider, Max/MSP |

**Recommendation**: A hybrid approach where:
- Signals for synthesis and visuals
- Events/triggers for sequencing
- Clear interop between the two

### Language Style

| Style | Pros | Cons | Examples |
|-------|------|------|----------|
| **Embedded DSL** | Full host language power | Complex for beginners | Strudel (JS), Overtone (Clojure) |
| **Custom Syntax** | Optimized for domain | Learning curve | Punctual, Tidal mini notation |
| **Visual/Node** | Intuitive | Limited for complexity | Max/MSP, VCV Rack |

**Recommendation**: Custom syntax with optional JS/TS escape hatches. Simpler for users, controlled complexity.

## Proposed Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        User Code                             │
│              (custom uzulang syntax)                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Lexer/Parser                              │
│              (Peggy or custom)                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     Core AST                                 │
│           (TypeScript/Rust types)                            │
└──────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│   Audio Compiler       │  │     Visual Compiler            │
│   (-> AudioWorklet JS) │  │     (-> GLSL shaders)          │
└────────────────────────┘  └────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│   Web Audio Runtime    │  │     WebGL Runtime              │
│   (AudioContext)       │  │     (Canvas/WebGL2)            │
└────────────────────────┘  └────────────────────────────────┘
```

## Component Designs

### 1. Core AST (Novel Design)

Rather than Pattern (Strudel) or Signal (Punctual), consider a **"Flow"** abstraction:

```typescript
// A Flow produces values over time
// Can be discrete (events) or continuous (samples)
type Flow<T> = {
  kind: 'continuous' | 'discrete';
  query: (time: TimeRange) => FlowValue<T>[];
};

// Unified time model
type TimeRange = {
  start: Rational;
  end: Rational;
  sampleRate?: number; // For continuous flows
};

// Values can be events or samples
type FlowValue<T> = {
  time: Rational;
  duration?: Rational;
  value: T;
};
```

This unifies events and signals under one abstraction.

### 2. New Syntax (Not Mini Notation)

Design goals:
- Readable without special knowledge
- Discoverable operations
- Good error messages
- Distinct from existing languages

**Example syntax ideas:**

```
// Sequencing (different from mini notation)
beat: kick . snare . [hihat hihat] . snare

// Signals (different from Punctual)
wave: sin(440) * env(0.1, 0.3)

// Combining
output: wave @ beat  // trigger wave on beat events

// Visuals
visual: circle(0.5) | color(sin(time), 0, 0)
```

### 3. Audio Compiler

Target: AudioWorklet JavaScript

Approach:
1. Type-check AST
2. Determine required buffers/state
3. Generate optimized JS process function
4. Handle scheduling/timing

Reference materials (non-GPL):
- Web Audio API spec
- "The Audio Programming Book" (Boulanger/Lazzarini)
- DAFX textbook

### 4. Visual Compiler

Target: WebGL2 GLSL

Approach:
1. Type-check AST (with channel inference)
2. Generate fragment shader code
3. Set up uniforms (time, audio data)
4. Render loop coordination

Reference materials (non-GPL):
- WebGL2 spec
- "The Book of Shaders"
- three.js source (MIT)

### 5. Scheduler

Requirements:
- Sample-accurate timing
- Low latency
- Sync between audio and visuals
- Handle tempo changes

Modern approach:
- Use SharedArrayBuffer for audio thread communication
- AudioWorklet for synthesis
- requestAnimationFrame for visuals
- Link via atomic clock

Reference: Chris Wilson's "A Tale of Two Clocks"

## Implementation Language Options

### Option A: TypeScript

Pros:
- Same language as target (browser)
- Good tooling
- Easy Web Audio integration

Cons:
- Runtime overhead
- Harder to optimize

### Option B: Rust + WASM

Pros:
- Performance
- Safety
- Can share code with native (Steam)

Cons:
- WASM + Web Audio complexity
- Harder FFI

### Option C: Hybrid

- Core/AST in Rust/WASM
- Runtime glue in TypeScript
- AudioWorklet in plain JS

**Recommendation**: Start with TypeScript for speed, optimize hot paths to Rust/WASM later.

## Novel Features to Consider

### 1. Live Debugging
- Step through pattern time
- Visualize signal values
- Edit while playing

### 2. Collaborative
- Multi-user sessions
- Real-time sync
- Shared patterns

### 3. AI Integration
- Suggest completions
- Generate variations
- Explain code

### 4. Steam-Specific
- Achievements for compositions
- Workshop sharing
- Steam Input for controllers
- Leaderboards for challenges

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Legal challenge | Document clean-room process |
| Performance issues | Benchmark early, WASM fallback |
| User adoption | Good docs, tutorials |
| Scope creep | MVP first |

## Next Steps

1. **Define MVP feature set** - What's the minimum viable language?
2. **Design syntax formally** - Write grammar specification
3. **Prototype parser** - Test syntax with users
4. **Build audio backend** - Get sound working
5. **Add visuals** - Get graphics working
6. **Iterate** - User feedback loop

## Resources

### Papers to Study
- "Programming with Time" - TidalCycles foundations
- "Functional Reactive Programming" - FRP concepts
- "A Categorical Semantics of Signal Flow Graphs" - Mathematical foundations

### Textbooks
- "Computer Music" (Dodge & Jerse)
- "The Computer Music Tutorial" (Roads)
- "Designing Sound" (Farnell)

### MIT/BSD Codebases to Reference
- Tone.js - Audio abstractions
- Three.js - WebGL patterns
- Monaco Editor - Code editor integration
