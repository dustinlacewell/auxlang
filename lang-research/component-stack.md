# Component Stack Analysis

## Full Technology Stack Required

This document breaks down every component needed for a live-coding audio/visual system and identifies safe (MIT/BSD) options vs. components requiring clean-room implementation.

## Layer 1: Language & Parser

### Parser Generator
| Option | License | Notes |
|--------|---------|-------|
| **Peggy** | MIT | Recommended - mature, good errors |
| nearley | MIT | Earley parser, handles ambiguity |
| moo | BSD | Tokenizer, pairs with nearley |
| ANTLR | BSD | Heavy but powerful |
| tree-sitter | MIT | Incremental, good for editors |
| hand-written | - | Full control, more work |

**Recommendation**: Peggy for MVP, tree-sitter for editor integration

### AST Design
**Must design from scratch** - cannot copy Strudel or Punctual AST structure.

Key decisions:
- Typed vs untyped
- S-expression vs custom nodes
- Location tracking for errors
- Optimization hints

## Layer 2: Core Abstractions

### Time Representation
| Option | Notes |
|--------|-------|
| Floating point | Simple, lossy |
| Rational numbers | Exact, complex |
| Fixed point | Fast, bounded |
| Hybrid | Rational for structure, float for DSP |

**Recommendation**: Rational for musical time, float for audio samples

Rational library options:
- fraction.js (MIT)
- Custom implementation (simple)
- Rust rational crate via WASM

### Event/Signal Model
**Must design from scratch.**

Considerations:
- Pull-based (query time range)
- Push-based (emit events)
- Hybrid (pull structure, push data)

## Layer 3: Audio Engine

### Web Audio Context
| Component | Status | Notes |
|-----------|--------|-------|
| AudioContext | Browser standard | Free to use |
| AudioWorklet | Browser standard | Modern approach |
| AudioParam | Browser standard | Automation |
| MediaStreamDestination | Browser standard | Recording |

### DSP Building Blocks
**All public domain algorithms:**

| DSP | Algorithm Source |
|-----|-----------------|
| Oscillators | Basic trig functions |
| Envelopes | ADSR formulas (1960s) |
| Filters | RBJ Audio EQ Cookbook (public) |
| Reverb | Schroeder reverb (1962 paper) |
| Delay | Trivial circular buffer |
| FFT | Cooley-Tukey (1965, public) |
| Granular | Roads' papers |

**Safe libraries:**
- standardized-audio-context (MIT) - Polyfill
- audio-worklet-polyfill (MIT)
- FFT.js (MIT) - FFT implementation

### Sampler
| Feature | Implementation |
|---------|---------------|
| Loading | fetch + decodeAudioData (standard) |
| Playback | AudioBufferSourceNode (standard) |
| Pitch shift | playbackRate (standard) |
| Time stretch | Phase vocoder (public algorithm) |

## Layer 4: Visual Engine

### WebGL
| Component | Status |
|-----------|--------|
| WebGL2 | Browser standard |
| GLSL ES 3.0 | Khronos standard |
| Canvas 2D | Browser standard |

### Abstractions
| Option | License | Notes |
|--------|---------|-------|
| **Raw WebGL** | - | Full control, verbose |
| **regl** | MIT | Functional WebGL |
| **twgl** | MIT | Thin WebGL helper |
| **three.js** | MIT | Full 3D engine |
| **pixi.js** | MIT | 2D optimized |
| Hydra | AGPL | **AVOID** |

**Recommendation**: regl or raw WebGL for shaders, three.js if 3D needed

### GLSL Code Generation
**Must implement from scratch.**

Reference materials:
- GLSL ES spec (public)
- "The Book of Shaders" (free online)
- Shadertoy examples (various licenses - check each)

## Layer 5: Scheduling & Sync

### Timing Approaches
| Approach | Pros | Cons |
|----------|------|------|
| setInterval | Simple | Inaccurate |
| requestAnimationFrame | Smooth visuals | 16ms resolution |
| AudioContext.currentTime | Accurate | Audio only |
| SharedArrayBuffer + Atomics | Best sync | Complex |
| Worker + postMessage | Offloads main thread | Latency |

**Recommendation**:
- AudioWorklet for audio timing (sample accurate)
- requestAnimationFrame for visuals
- SharedArrayBuffer to sync if needed

### Clock Reference
```javascript
// Safe pattern (not copied from any GPL source)
class Clock {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.tempo = 120; // BPM
    this.startTime = 0;
  }

  get beat() {
    return (this.ctx.currentTime - this.startTime) * (this.tempo / 60);
  }

  beatToTime(beat) {
    return this.startTime + beat * (60 / this.tempo);
  }
}
```

## Layer 6: Editor Integration

### Code Editor
| Option | License | Notes |
|--------|---------|-------|
| **Monaco** | MIT | VSCode's editor |
| CodeMirror 6 | MIT | Lighter, extensible |
| Ace | BSD | Mature |

**Recommendation**: CodeMirror 6 - better for custom languages

### Editor Features Needed
- Syntax highlighting (custom grammar)
- Error markers
- Autocomplete
- Evaluation hotkeys
- Live preview

CodeMirror packages (all MIT):
- @codemirror/lang-* (examples to follow)
- @codemirror/autocomplete
- @codemirror/lint
- @lezer/generator (parser generator)

## Layer 7: Runtime & Evaluation

### Code Evaluation
| Approach | Safety | Performance |
|----------|--------|-------------|
| eval() | Low | High |
| Function() | Low | High |
| Interpreter | High | Medium |
| Compile to WASM | High | High |

**Recommendation**:
- Compile to restricted JS subset for audio
- Generate GLSL for visuals
- No arbitrary code execution

### State Management
| Option | License |
|--------|---------|
| Redux | MIT |
| Zustand | MIT |
| nanostores | MIT |
| Custom | - |

## Layer 8: Steam Integration

### Steamworks SDK
- License: Proprietary (free for Steam games)
- Provides: Achievements, Workshop, Friends, etc.

### Electron/Tauri
| Option | License | Notes |
|--------|---------|-------|
| Electron | MIT | Chromium-based |
| Tauri | MIT/Apache 2.0 | Lighter, Rust |
| NW.js | MIT | Alternative to Electron |

**Recommendation**: Tauri for smaller binary size

## Full Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│ Steam/Tauri Shell (MIT/Proprietary)                         │
├─────────────────────────────────────────────────────────────┤
│ CodeMirror 6 Editor (MIT)                                   │
├─────────────────────────────────────────────────────────────┤
│ Parser: Peggy (MIT) + Custom Grammar (original)             │
├─────────────────────────────────────────────────────────────┤
│ Core: Custom AST + Compiler (original)                      │
├──────────────────────────┬──────────────────────────────────┤
│ Audio:                   │ Visual:                          │
│ - Web Audio (standard)   │ - WebGL2 (standard)              │
│ - AudioWorklet (std)     │ - regl helper (MIT)              │
│ - DSP (public domain)    │ - GLSL gen (original)            │
├──────────────────────────┴──────────────────────────────────┤
│ Scheduler: Custom implementation (original)                 │
├─────────────────────────────────────────────────────────────┤
│ State: Zustand or nanostores (MIT)                          │
└─────────────────────────────────────────────────────────────┘
```

## Must Build From Scratch

1. **Language syntax/grammar** - Original design
2. **AST types** - Original structure
3. **Pattern/Signal abstraction** - Original model
4. **Audio compiler** - Original implementation
5. **GLSL compiler** - Original implementation
6. **Scheduler logic** - Original implementation

## Can Use Existing (MIT/BSD)

1. Peggy parser generator
2. CodeMirror editor
3. Web Audio API
4. WebGL API
5. regl/three.js helpers
6. Tone.js DSP reference
7. Tauri desktop wrapper

## Estimated Development Effort

| Component | Person-Weeks | Dependencies |
|-----------|--------------|--------------|
| Grammar design | 2 | None |
| Parser implementation | 2 | Grammar |
| AST + type system | 3 | Parser |
| Audio compiler | 4 | AST |
| Visual compiler | 4 | AST |
| Scheduler | 2 | Audio |
| Editor integration | 3 | Parser, AST |
| Desktop wrapper | 2 | All above |
| **Total** | **22 weeks** | |

This assumes one experienced developer working full-time. Add 50% for unknowns.
