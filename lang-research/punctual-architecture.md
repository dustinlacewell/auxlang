# Punctual Architecture Research

## Overview

Punctual is a live-coding language for audio and visuals, written in **PureScript** that compiles to JavaScript. Licensed under **GPL-3.0** (not AGPL, but still copyleft).

## License: GPL-3.0

The GPL license means:
- Derivative works must also be GPL
- Distribution requires source code
- **Unlike AGPL**, network use doesn't trigger copyleft
- Still cannot be used in proprietary Steam games

## Core Architecture

### 1. Language Design

Punctual is a **signal-flow language** - everything is a continuous signal, not discrete events.

Key difference from Strudel:
- **Strudel**: Discrete events scheduled over time (pattern-based)
- **Punctual**: Continuous signals evaluated every sample/frame (signal-based)

### 2. AST & Parser (`AST.purs`, `Parser.purs`, `TokenParser.purs`)

Written in PureScript using the `parsing` library.

**AST Types**:
```purescript
data Expression =
  Reserved Position String |        -- Built-in functions
  Identifier Position String |      -- Variables
  LiteralInt Position Int |
  LiteralNumber Position Number |
  LiteralString Position String |
  ListExpression Position MultiMode (List Expression) |
  Application Position Expression Expression |
  Operation Position String Expression Expression |
  FromTo Position Int Int |         -- Range syntax: 1..10
  FromThenTo Position Number Number Number |
  Lambda Position (List String) Expression |
  IfThenElse Position Expression Expression Expression
```

**Key syntax features**:
- Haskell-like function application
- Operators with precedence levels (7 levels)
- List/signal construction with `[...]` and `{...}`
- Lambda expressions
- Range notation (`1..10`, `1,3..10`)

### 3. Signal System (`Signal.purs`)

The core abstraction - a large ADT representing all possible signals:

```purescript
data Signal =
  Constant Number |
  SignalList MultiMode (List Signal) |
  -- Coordinates
  Px | Py | Pxy | Fx | Fy | Fxy | FRt | FR | FT |
  -- Audio analysis
  Lo | Mid | Hi | FFT | IFFT |
  -- Time
  Cps | Time | Beat | EBeat | ETime | Rnd |
  -- Oscillators
  Osc Signal | Tri Signal | Saw Signal | Sqr Signal |
  -- Math (unary)
  Sin Signal | Cos Signal | Tan Signal | Abs Signal | ...
  -- Operations (binary)
  Addition MultiMode Signal Signal |
  Product MultiMode Signal Signal |
  -- Filters
  LPF MultiMode Signal Signal Signal |
  HPF MultiMode Signal Signal Signal |
  -- Visual
  Circle MultiMode Signal Signal |
  Line MultiMode Signal Signal Signal |
  -- etc... (100+ constructors)
```

**MultiMode**: Determines how multi-channel signals combine
- `Combinatorial`: Cross-product of channels
- `Pairwise`: Zip channels together

### 4. Audio Backend (`AudioWorklet.purs`, `W.purs`)

Generates JavaScript AudioWorklet code at runtime!

**W Monad**: State monad for code generation
```purescript
type WState = {
  allocatedFloats :: Int,
  allocatedInts :: Int,
  code :: String,
  time :: Sample,
  beat :: Sample,
  ...
}
```

The compiler:
1. Takes a `Signal` AST
2. Traverses it generating JavaScript code strings
3. Creates an AudioWorklet processor class
4. Registers and connects it to Web Audio graph

Example generated code:
```javascript
class punctual_xyz extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    for(let n=0; n<128; n++){
      const t = currentTime + (n/sampleRate);
      const time = t - originAudio;
      // ... generated signal computation
      output[0][n] = f[42] * fade;
    }
    return true;
  }
}
```

### 5. Visual Backend (`FragmentShader.purs`, `WebGL.purs`, `G.purs`)

Generates GLSL fragment shaders at runtime!

**G Monad**: State monad for GLSL generation
- Tracks texture bindings
- Manages coordinate transformations
- Handles time/beat uniforms

The compiler:
1. Takes a `Signal` AST
2. Traverses generating GLSL code
3. Creates fragment shader source
4. Compiles and links WebGL program

Example: `osc 10 * [1,0,0] >> video` generates shader code for a red oscillating pattern.

### 6. Main/Runtime (`Main.purs`, `SharedResources.purs`)

- Manages WebGL context and canvases
- Handles audio context and worklet lifecycle
- Coordinates tempo (uses `purescript-tempi` library)
- Crossfade between program updates

## Dependencies Analysis

### PureScript Ecosystem:
- `parsing` - Parser combinators (MIT)
- `purescript-tempi` - Tempo/timing (MIT, by same author)
- Standard PureScript libs (prelude, effect, aff, etc.) - mostly MIT/BSD

### JavaScript:
- `esbuild` - Bundler (MIT)
- Web APIs (WebGL, Web Audio) - browser standards

### GPL Concerns:
The entire Punctual codebase is GPL-3.0

## What Would Need Reimplementation

### Must Rewrite (GPL contaminated):
1. **Signal ADT** - The specific signal representation
2. **Parser** - Grammar and syntax
3. **Audio code generator** - W monad and worklet generation
4. **Visual code generator** - G monad and shader generation
5. **Runtime/coordination** - Main module logic

### Can Potentially Reuse Concepts:
- General idea of "signal as AST compiled to target code"
- Standard DSP algorithms (biquad filters, oscillators)
- WebGL/GLSL fundamentals (standard knowledge)
- AudioWorklet patterns (standard API)

## Key Insights for Clean-Room Implementation

1. **Compilation approach is powerful**: Compiling signals to native code (JS/GLSL) is performant
2. **Dual backend**: Same AST targets both audio and visuals
3. **PureScript choice**: Strong types help, but adds build complexity
4. **Code generation monads**: Clean pattern for generating target code

## Design Tradeoffs

### Pros:
- Unified audio/visual language
- High performance (compiled to native)
- Mathematically elegant signal model
- Smooth transitions between programs

### Cons:
- PureScript adds toolchain complexity
- Limited expressiveness vs. general programming
- Fixed set of built-in operations
- No pattern/sequencing (must use signals for rhythm)

## Estimated Complexity

| Component | LOC | Difficulty | Notes |
|-----------|-----|------------|-------|
| Signal types | ~500 | Medium | Large but straightforward ADT |
| Parser | ~600 | Medium | Standard parser combinators |
| Audio codegen | ~700 | High | Tricky DSP correctness |
| Visual codegen | ~1200 | High | Complex GLSL generation |
| Runtime | ~500 | Medium | WebGL/Audio coordination |

## Comparison with Strudel

| Aspect | Strudel | Punctual |
|--------|---------|----------|
| Paradigm | Pattern/Event | Signal/Continuous |
| Language | JavaScript | PureScript->JS |
| Audio | Interpreted Web Audio | Compiled AudioWorklet |
| Visuals | Hydra integration | Native GLSL generation |
| License | AGPL-3.0 | GPL-3.0 |
| Sequencing | Built-in mini notation | Must use signal math |
