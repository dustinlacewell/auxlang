# Kabelsalat Architecture

## Overview

Kabelsalat is "an experimental live-codable modular synthesizer" by Felix Roos (same author as Strudel).

**License: AGPL-3.0-or-later** (same as Strudel - cannot use directly)

## Core Model

Kabelsalat is a **signal graph** language. The fundamental abstraction is `Node`:

```
Node {
  type: string       // e.g. "sine", "mul", "delay"
  value?: any        // for constants
  ins: Node[]        // input connections
}
```

Key insight: It builds a **DAG of nodes** that gets compiled to AudioWorklet code.

## Architecture

```
User Code (JS with method chaining)
         ↓
   Node Graph (AST)
         ↓
   Topological Sort
         ↓
   Compile to JS/C
         ↓
   AudioWorklet execution
```

## Syntax Style

Method chaining on nodes:
```javascript
sine(220).mul(0.5).out()

impulse(2).seq(220,330,440).sine().out()

sine(220).mul(impulse(1).ad(.01,.1)).out()
```

Key pattern: `source.transform.transform.out()`

## Key Primitives

### Sources
- `sine(freq)`, `saw(freq)`, `tri(freq)`, `pulse(freq, pw)`
- `noise()`, `pink()`, `brown()`
- `impulse(freq)`, `dust(density)` - trigger sources
- `time()` - elapsed time

### Envelopes
- `adsr(gate, a, d, s, r)` - triggered envelope
- `ad(gate, a, d)`, `ar(gate, a, r)` - shortcuts

### Sequencing
- `seq(trig, ...values)` - trigger-driven step sequencer
- `hold(input, trig)` - sample and hold

### Filters
- `lpf(cutoff)`, `hpf(cutoff)`, `bpf(cutoff)`
- `filter(cutoff, reso)`

### Effects
- `delay(time)`, `distort(amt)`, `fold(rate)`
- `lag(rate)`, `slew(up, dn)` - smoothing

### Math
- `mul(x)`, `add(x)`, `sub(x)`, `div(x)`
- `range(lo, hi)` - scale -1..1 to lo..hi
- `mod(x)`, `abs()`, `floor()`, `ceil()`

### Multichannel
- `poly` node type for expansion
- Arrays auto-expand: `sine([110, 220, 330])`

## Compilation

From `compiler.js`:
1. Topological sort of node graph
2. Generate code line-by-line
3. Each node type has a `compile` function
4. Output is JS that runs in AudioWorklet

## Relationship to Strudel

Kabelsalat is the **continuous/signal side** that Strudel lacks:
- Strudel: Pattern → discrete events → trigger superdough
- Kabelsalat: Signal graph → continuous audio

They share author but are separate projects. Potential integration point would be Strudel patterns triggering Kabelsalat envelopes.

## Relevance to Uzulang

Kabelsalat demonstrates:
1. Method chaining works well for signal graphs
2. Compiling to AudioWorklet is viable
3. Trigger-based sequencing (`seq`, `impulse`) bridges discrete/continuous
4. Multichannel expansion via arrays
5. Feedback via functions: `x => x.delay(.1).mul(.8)`

## Primitives from lib.js (partial)

| Category | Nodes |
|----------|-------|
| Oscillators | `sine`, `saw`, `tri`, `pulse`, `zaw` |
| Noise | `noise`, `pink`, `brown`, `dust` |
| Triggers | `impulse`, `clock`, `clockdiv` |
| Envelopes | `adsr`, `ad`, `ar` |
| Sequencing | `seq`, `hold` |
| Filters | `filter`, `lpf`, `hpf`, `bpf` |
| Delay | `delay` |
| Distortion | `distort`, `fold` |
| Smoothing | `lag`, `slew`, `slide` |
| Math | `mul`, `add`, `sub`, `div`, `mod`, `range` |
| MIDI | `midifreq`, `midigate`, `midivel` |
| Meta | `time`, `raw`, `bytebeat` |
