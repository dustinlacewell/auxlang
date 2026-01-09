# Design Considerations for Uzulang

## Key Insight: Audio and Visual Systems Don't Need Unification

The audio and visual subsystems can be **separate but interacting**, rather than forced into a single unified paradigm.

### Precedents
- **Strudel + Hydra**: Pattern system feeds into separate visual synth
- **TidalCycles + Processing**: OSC communication between systems
- **SuperCollider + openFrameworks**: Shared OSC/data bus

### Implications

1. **Audio System** can optimize for:
   - Event/pattern-based scheduling
   - Sample-accurate timing
   - Complex rhythm and sequencing
   - MIDI-like discrete events

2. **Visual System** can optimize for:
   - Continuous fragment evaluation
   - GPU shader execution
   - Per-pixel computation
   - 60fps render loop

3. **Interaction Points** (where they connect):
   - Audio analysis → visual parameters (FFT, amplitude)
   - Pattern triggers → visual events
   - Shared tempo/beat clock
   - Common parameter control

## Revised Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Uzulang Source Code                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Parser                                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│     Audio AST            │    │      Visual AST              │
│  (Pattern/Event based)   │    │   (Signal/Shader based)      │
└──────────────────────────┘    └──────────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   Audio Compiler         │    │    Visual Compiler           │
│   → AudioWorklet JS      │    │    → GLSL Fragment Shader    │
└──────────────────────────┘    └──────────────────────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   Audio Runtime          │    │    Visual Runtime            │
│   - Pattern scheduler    │    │    - WebGL context           │
│   - WebAudio graph       │    │    - Render loop             │
│   - Sample playback      │    │    - Texture management      │
└──────────────────────────┘    └──────────────────────────────┘
              │                               │
              └───────────┬───────────────────┘
                          ▼
              ┌──────────────────────────┐
              │     Shared Bus           │
              │  - Tempo/beat clock      │
              │  - Audio analysis data   │
              │  - Trigger events        │
              │  - Control parameters    │
              └──────────────────────────┘
```

## What This Means for Feature Requirements

### Audio Side (Strudel-inspired)
Focus on:
- Mini notation or similar terse sequencing syntax
- Pattern combinators (stack, cat, fast, slow, etc.)
- Euclidean rhythms
- Sample playback
- Synthesis (oscillators, filters, envelopes)
- Effects (delay, reverb, etc.)
- Higher-order pattern functions

Does NOT need:
- Fragment coordinates
- Shader compilation
- Visual blending modes

### Visual Side (Punctual-inspired)
Focus on:
- Fragment coordinates (fx, fy)
- Continuous signals
- Shapes and primitives
- Spatial transforms
- Color operations
- Feedback
- Video/image sources

Does NOT need:
- Cycle-based sequencing
- Sample playback
- Complex event scheduling

### Shared/Bridge Features
Both need:
- Tempo/BPM control
- Time signals (beat, time)
- Basic math operations
- Random/noise

Audio → Visual:
- FFT data
- Amplitude/envelope followers
- Beat triggers
- Note/frequency data

Visual → Audio (rare but possible):
- Mouse/touch position as control
- Visual brightness as control signal

## Syntax Options

### Option A: Separate Blocks
```
audio {
  s("bd sd [~ bd] sd") * fast(2)
}

visual {
  circle(0, lo * 0.5) >> video
}
```

### Option B: Output Targets Determine Context
```
"bd sd" >> sound
circle(0, lo * 0.5) >> video
```

### Option C: Unified Syntax, Context-Aware
```
// Audio patterns use quotes/mini notation
"bd sd [~ bd] sd".fast(2)

// Visual uses function calls
circle(0, lo * 0.5)

// Output is implicit or explicit
```

### Option D: Different File Types
- `.uza` for audio
- `.uzv` for visual
- Both import shared `.uz` modules

## Recommended Approach

**Option B or C** - Let the output target (`>> sound`, `>> video`) determine which compiler handles the expression. This allows:

1. Shared syntax for common operations (math, time, etc.)
2. Natural expression of domain-specific concepts
3. Single file for coordinated audio-visual pieces
4. Clear mental model for users

## Next Steps

1. Design audio subsystem syntax (Strudel-like but fresh)
2. Design visual subsystem syntax (Punctual-like but fresh)
3. Define the shared bus / interaction protocol
4. Prototype each independently
5. Integrate via shared runtime
