# Licensing Analysis for Steam Game Development

## Executive Summary

**Neither Strudel (AGPL-3.0) nor Punctual (GPL-3.0) can be used directly in a proprietary Steam game.** A clean-room implementation would be required for any commercial closed-source product.

## License Comparison

| License | Strudel | Punctual | Steam Compatible? |
|---------|---------|----------|-------------------|
| Type | AGPL-3.0 | GPL-3.0 | No / No |
| Copyleft | Strong + Network | Strong | - |
| Source Required | Yes (even SaaS) | Yes (distribution) | - |
| Derivative Work | Must be AGPL | Must be GPL | - |

## What "Clean-Room" Means

A clean-room implementation requires:
1. **No code copying** - Not even small snippets
2. **No direct translation** - Can't just rewrite in another language
3. **Independent design** - Must derive from public knowledge/specs
4. **Documentation** - Record that implementation is independent

**You CAN:**
- Study algorithms and understand concepts
- Read academic papers these projects reference
- Use the same third-party MIT/BSD libraries
- Implement similar functionality from specifications

**You CANNOT:**
- Copy code structure or algorithms directly
- Use the same variable/function names in similar patterns
- "Translate" PureScript to TypeScript line-by-line
- Use any AGPL/GPL-licensed dependencies

## Component-by-Component Feasibility

### 1. Parser/Grammar

| Aspect | Strudel | Punctual | Clean-Room Feasibility |
|--------|---------|----------|------------------------|
| Tool | Peggy (MIT) | PureScript parsing (MIT) | **Easy** - tools are free |
| Grammar | Custom mini notation | Custom functional syntax | **Easy** - design new syntax |

**Recommendation**: Create entirely new syntax. Don't copy mini notation or Punctual syntax. This is actually an opportunity for innovation.

### 2. Core Abstraction

| Aspect | Strudel | Punctual | Clean-Room Feasibility |
|--------|---------|----------|------------------------|
| Model | Pattern (Time -> Events) | Signal (continuous) | **Medium** - need original design |
| Theory | Based on TidalCycles research | Based on FRP concepts | Can study underlying theory |

**Recommendation**: The "pattern as function" idea comes from academic research (Alex McLean's PhD thesis). You can read the papers and derive your own implementation. Consider hybrid approaches.

### 3. Audio Engine

| Aspect | Strudel | Punctual | Clean-Room Feasibility |
|--------|---------|----------|------------------------|
| Approach | Web Audio nodes | AudioWorklet codegen | **Easy** - standard APIs |
| DSP | Standard filters, synths | Standard DSP | Public domain algorithms |

**Recommendation**: Web Audio API is a standard. DSP algorithms (filters, oscillators) are well-documented in textbooks. This is the easiest component to reimplement.

### 4. Visual Engine

| Aspect | Strudel | Punctual | Clean-Room Feasibility |
|--------|---------|----------|------------------------|
| Approach | Hydra (AGPL!) | Custom GLSL gen | **Medium** - WebGL is standard |
| Shaders | Via Hydra | Runtime compilation | Standard GLSL knowledge |

**Recommendation**: Cannot use Hydra. WebGL/GLSL is standard. Can implement custom shader generation. Consider using existing MIT-licensed shader libraries.

### 5. Scheduler/Timing

| Aspect | Strudel | Punctual | Clean-Room Feasibility |
|--------|---------|----------|------------------------|
| Approach | setInterval + latency | AudioWorklet native | **Easy** - standard problem |
| Sync | Pattern queries ahead | Sample-accurate | Well-documented approaches |

**Recommendation**: Audio scheduling is a well-studied problem. Chris Wilson's "A Tale of Two Clocks" is the canonical reference. SharedArrayBuffer + AudioWorklet is the modern approach.

## Safe Third-Party Libraries

These MIT/BSD libraries can be used freely:

### Parsing
- **Peggy** (MIT) - PEG parser generator
- **nearley** (MIT) - Another parser generator
- **moo** (BSD) - Tokenizer
- **acorn** (MIT) - JS parser

### Audio
- **Tone.js** (MIT) - High-level Web Audio
- **standardized-audio-context** (MIT) - AudioContext polyfill
- **audio-worklet-polyfill** (MIT)

### Visuals
- **three.js** (MIT) - 3D WebGL
- **pixi.js** (MIT) - 2D WebGL
- **glslCanvas** (MIT) - GLSL playground
- **regl** (MIT) - Functional WebGL

### General
- **TypeScript** (Apache-2.0) - Type system
- **Vite** (MIT) - Bundler
- **Rust/wasm** - For performance-critical code

## Problematic Dependencies

**AVOID:**
- `hydra-synth` (AGPL-3.0) - Strudel's visual engine
- Any `@strudel/*` packages
- Any Punctual source code
- `tidalcycles` / `tidal` packages

## Alternative Approaches

### 1. License the Code
Contact Alex McLean (Strudel) or David Ogborn (Punctual) about commercial licensing. Some FOSS authors offer dual-licensing.

### 2. Server-Side Processing
Run AGPL code on server, stream results to client. AGPL requires source disclosure but allows API access. Complex for real-time audio.

### 3. Plugin Architecture
Make the game a "platform" that loads GPL modules as plugins. User provides GPL components. Legal grey area.

### 4. Full Clean-Room (Recommended)
Design and implement from scratch using only:
- Public knowledge (papers, specs, textbooks)
- MIT/BSD licensed libraries
- Browser standard APIs

## Research Resources for Clean-Room Implementation

### Academic Papers (Public Knowledge)
- Alex McLean's PhD thesis on TidalCycles
- FRP (Functional Reactive Programming) papers
- Music-N family literature (Csound, SuperCollider theory)

### Specifications (Public)
- Web Audio API spec (W3C)
- WebGL/GLSL spec (Khronos)
- MIDI 1.0/2.0 specs (MMA)

### Textbooks (General Knowledge)
- "The Audio Programming Book" - DSP fundamentals
- "Designing Sound" - Procedural audio
- "Real-Time Rendering" - Graphics fundamentals
- "DAFX" - Digital audio effects

### MIT/BSD Reference Implementations
- Tone.js source code
- SuperCollider (GPL but extensive documentation)
- Csound (LGPL - more permissive for linking)

## Recommendation

**For a Steam game, pursue clean-room implementation.**

1. Design a new language syntax (opportunity for UX innovation)
2. Use standard Web Audio / AudioWorklet for audio
3. Use three.js or custom WebGL for visuals
4. Study the academic theory, not the code
5. Document your independent development process

This is more work but results in:
- Full ownership of IP
- No licensing concerns
- Freedom to innovate
- Commercial viability
