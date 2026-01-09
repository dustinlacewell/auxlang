# Syntax Proposal: JavaScript with Device Descriptors

## Overview

Users write JavaScript. The framework provides device objects that build up a **lazy DAG of descriptors**. Nothing runs until connected to `out()`. The graph is then walked, deduplicated, and reified into an actual audio graph.

## Core Concepts

### Devices are Descriptor Factories

```javascript
lfo                          // base descriptor: { type: 'lfo', inputs: {} }
lfo.rate(4)                  // new descriptor: { type: 'lfo', inputs: { rate: 4 } }
lfo.rate(4).depth(100)       // new descriptor: { type: 'lfo', inputs: { rate: 4, depth: 100 } }
```

Each `.input(value)` call returns a **new descriptor with a new identity**. The original is unchanged (immutable).

### Outputs are Accessors

```javascript
lfo.rate(4).cv               // output reference: { device: <the lfo descriptor>, output: 'cv' }
seq.pat("c3 e3").gate        // output reference: { device: <the seq descriptor>, output: 'gate' }
```

### Wiring is Explicit

```javascript
melody = seq.pat("c3 e3 g3")
voice = osc.pitch(melody.cv).wave(saw)
shape = env.trig(melody.gate).attack(0.1)
filter = lpf.in(voice * shape).cutoff(800)
out(filter)
```

No magic "main" connections. You say exactly what connects to what.

### Default Inputs and Outputs

Devices can declare a default input and output:

```javascript
// saw declares 'pitch' as default input, 'out' as default output
saw(f.cv)          // means saw.pitch(f.cv)
saw(f.cv) * 0.5    // means saw.pitch(f.cv).out * 0.5

// lpf declares 'in' as default input
lpf(oscs).cutoff(800)  // means lpf.in(oscs).cutoff(800)

// env declares 'trig' as default input
env(f.gate).attack(0.01)  // means env.trig(f.gate).attack(0.01)

// seq has multiple outputs (cv, gate, accent) - no default output
// must be explicit: melody.cv, melody.gate
```

This enables terse functional-style chaining.

### Lazy Evaluation

```javascript
slowLfo = lfo.rate(1)
fastLfo = lfo.rate(10)
unused = osc.pitch(fastLfo.cv)  // never connected to out

out(osc.pitch(slowLfo.cv))      // only slowLfo and this osc are reified
```

`unused` and `fastLfo` are never instantiated in the audio graph.

### Deduplication by Identity

```javascript
sharedLfo = lfo.rate(2)
v1 = osc.pitch(440).pw(sharedLfo.cv)
v2 = osc.pitch(880).pw(sharedLfo.cv)

out(v1 + v2)  // one lfo instance feeds both oscillators
```

Same descriptor reference = same node in audio graph.

### New Identity on Mutation

```javascript
baseLfo = lfo.rate(2)
variation = baseLfo.depth(100)  // NEW identity

v1 = osc.pw(baseLfo.cv)
v2 = osc.pw(variation.cv)

out(v1 + v2)  // TWO lfo instances (different descriptors)
```

## Examples

### Basic Synth Voice

```javascript
f = seq("c3 e3 g3 b3")
out(saw(f.cv) * env(f.gate).attack(0.01).release(0.3))
```

### Filter Sweep with LFO

```javascript
f = seq("c3 e3 g3")
voice = saw(f.cv) * env(f.gate)
sweep = lfo(0.5).range(200, 2000)

out(lpf(voice).cutoff(sweep))
```

### Polyrhythm with Loops

```javascript
out(mix(
  [3, 4, 5].map(n =>
    saw(seq("c3").clock(impulse(n)).cv) * env(impulse(n))
  )
))
```

### Supersaw via Loop

```javascript
f = seq("c3 e3 g3")
oscs = [-12, -5, 0, +5, +12].map(d => saw(f.cv).detune(d))
out(mix(oscs) * env(f.gate))
```

### Custom "Device" as Function

```javascript
function supersaw(cv, gate) {
  oscs = [-12, -5, 0, +5, +12].map(d => saw(cv).detune(d))
  return mix(oscs) * env(gate).attack(0.01).release(0.3)
}

f = seq("c3 e3 g3")
out(lpf(supersaw(f.cv, f.gate)).cutoff(800))
```

### Chained Sequencers

```javascript
master = seq("c2 g2")
slave = seq("c4 e4 g4 b4").clock(master.gate)

out(
  square(master.cv) * 0.5
  + saw(slave.cv) * env(slave.gate)
)
```

### Feedback Delay

```javascript
f = seq("c3 e3")
src = saw(f.cv) * env(f.gate)
dly = delay(src + dly * 0.6).time(0.25)  // self-reference

out(src + dly * 0.4)
```

### Kabelsalat-style Example

```javascript
f = seq("50 100 200 [300 500 <700 350>] 400")
e = env(f.gate).attack(0.01).decay(1.4)

detune = sine([0.04, 0.1]).range(1, 1.02).lag(0.2)

oscs = mix([0.5, 1, 2, 4].map(oct => saw(f.cv * detune * oct)))

out(
  lpf(distort(oscs + noise * 0.4, 0.6))
    .cutoff(e * sine([0.1, 0.34]).range(0.25, 0.9))
    .q(0.2)
  * e
  + delay(sine([0.1, 0.2, 0.3]).rangex(0.02, 0.3)) * 0.8
)
```

## Device Definition (for Workshop authors)

```javascript
const saw = makeDevice({
  name: 'saw',
  inputs: {
    pitch: { default: 440 },
    detune: { default: 0 },
  },
  outputs: ['out'],
  defaultInput: 'pitch',
  defaultOutput: 'out',
  process(inputs, state, sampleRate) {
    const freq = inputs.pitch * Math.pow(2, inputs.detune / 1200)
    state.phase = (state.phase || 0) + freq / sampleRate
    state.phase %= 1
    return { out: state.phase * 2 - 1 }
  }
})
```

`device({...})` returns a callable descriptor factory that is itself a valid descriptor:

```javascript
// All equivalent - lfo with default rate=1:
lfo
lfo()
lfo.rate(1)

// Setting inputs:
lfo(4)           // sets default input (rate)
lfo.rate(4)      // explicit
lfo(4).depth(10) // chained

// Accessing outputs:
lfo.cv           // explicit output access
lfo * 500        // uses default output (cv)
```

- The factory object *is* the base descriptor (with default inputs)
- Calling it or chaining methods returns new descriptors
- Built-in devices (`saw`, `lfo`, `seq`, etc.) are just pre-shipped `device({...})` calls
- Users define custom devices with the exact same API

## Grammar Summary

**Expressions can contain:**
- Device calls: `saw(440)`, `seq("c3 e3")`, `lfo(2)`
- Input chaining: `saw(440).detune(5).pw(0.3)`
- Output access: `seq("c3").cv`, `seq("c3").gate`
- Math: `+`, `-`, `*`, `/`, `()`
- Numbers, strings, arrays (for polymorphic signals)
- JS variables, functions, array methods

**Built-in functions:**
- `out(signal)` - connect to audio output, triggers reification
- `mix(array)` - sum an array of signals
- `impulse(hz)` - clock signal at given frequency

**Everything else is plain JavaScript.**
