# Auxlang Quick Reference

## Core Concepts

**Signals** - What flows between devices:
- `number` - constant value (`440`, `0.5`)
- `OutputRef` - reference to device output (`s.cv`, `lfo.out`)
- `Descriptor` - shorthand for its default output

**Descriptors** - Lazy device specs forming a DAG:
- Created by calling device functions
- Immutable - methods return NEW descriptors
- Only executed when connected to `out()`

**Devices** - Have inputs, outputs, and default input/output for chaining.

## Pattern Syntax (Mini-Notation)

The string passed to `seq()`:

```
c4          note (pitch + octave)
~           rest
c4*4        multiply: repeat 4x within same duration
c4!4        replicate: repeat 4x (adds beats)
c4@4        elongate: hold across 4 beats
[c4 d4]     group: subdivide equally within one beat
<c4 d4>     alternate: cycle through each loop
c4_e4       tie: legato, gate held across
f#4 bb3     accidentals: sharps (#) and flats (b)
c4?         maybe: 50% probability
c4?.75      maybe: 75% probability
(3,8)       euclidean: 3 hits in 8 steps
{c4,e4,g4}  stack: parallel voices (polyphony)
```

Modifiers chain: `c4*2?.5` = multiply by 2, then 50% chance

## JavaScript API

**Device Instantiation:**
```javascript
saw(440)                              // positional: default input
lpf(audio, { cutoff: 800 })           // object: named inputs
lpf(audio).cutoff(800).resonance(0.5) // method chaining
saw(440).lpf({ cutoff: 800 })         // fluent style
```

**Variable Semantics:**
```javascript
let f = lpf(audio)           // f = lpf with defaults
let f2 = f.cutoff(800)       // f2 = new lpf, f unchanged
```

**Output Access:**
```javascript
let s = seq("c4 e4")
s.cv      // OutputRef to pitch
s.gate    // OutputRef to gate
s.trig    // OutputRef to trigger
```

**Chaining Devices:**
```javascript
s.saw()           // chains from default output (cv)
s.cv.saw()        // explicit output
s.gate.adsr()     // different output

// Fluent
s.saw().lpf({ cutoff: 800 }).gain({ level: s.gate.adsr() }).out()
```

**Multiple Outputs:**
```javascript
let s = seq("c4 e4").clk(clock(120))
let audio = s.saw().lpf({ cutoff: 1000 })
let env = s.gate.adsr({ attack: 0.01 })
audio.gain({ level: env }).out()
```

## Polyphony

**Pattern-level** (comma syntax):
```javascript
seq("{c4,e4,g4}")              // 3-voice chord
seq("{c4,e4} {d4,f4}")         // alternating chords
```

**JS-level** (poly function):
```javascript
poly([saw(220), saw(330), saw(440)])
```

**Accessing voices:**
```javascript
let chord = seq("{c4,e4,g4}").saw()
chord.voices        // array of 3 saw descriptors
chord.voices[0]     // first voice
```

**Propagation:**
- Chaining on poly forwards to each voice
- Params can be poly (per-voice) or mono (broadcast)
- Mixing at `out()` with 1/sqrt(n) scaling

## Devices

**Sources**: `osc`, `saw`, `sin`, `tri`, `sqr`, `noise`, `lfo`
**Drums**: `kick`, `snare`, `hihat`, `clap`
**Filters**: `lpf`, `hpf`, `bpf`, `notch` (cutoff, resonance)
**Envelopes**: `adsr`, `env` (gate, attack, decay, sustain, release)
**Effects**: `delay`, `tape`, `reverb`
**Utilities**: `gain`, `mix`, `slew`, `sah`, `pick`
**Math**: `mult`, `add`, `sub`, `div`, `scale`, `clip`, `abs`, `inv`, `mod`
**Logic**: `gte`, `lt`, `eq`, `and`, `or`, `not`
**Timing**: `clock`, `seq`, `clockDiv`, `clockMult`, `counter`

## Common Patterns

```javascript
// Sequenced synth with envelope
let s = seq("c3 e3 g3").clk(clock(120))
s.saw().lpf({ cutoff: 1000 }).gain({ level: s.gate.adsr() }).out()

// Chord pad
seq("{c4,e4,g4}").saw().lpf({ cutoff: 800 }).out()

// Drums
let c = clock(120)
kick(seq("c1 ~ c1 ~").clk(c).gate).out()
hihat(seq("c1*4").clk(c).gate).out()

// LFO modulation
let mod = lfo(0.5).min(200).max(2000)
seq("c2").clk(clock(60)).saw().lpf({ cutoff: mod }).out()
```

## Key Gotchas

1. **seq needs clock**: `seq("c4")` won't run until `.clk(clock(bpm))`

2. **Variables are snapshots**: Methods return new descriptors
   ```javascript
   // Wrong - arp doesn't have the clock
   let arp = seq("c4 e4")
   arp.clk(clock(120)).saw().gain({ level: arp.gate.adsr() })

   // Right - capture after clocking
   let arp = seq("c4 e4").clk(clock(120))
   arp.saw().gain({ level: arp.gate.adsr() }).out()
   ```

3. **out() is terminal**: Call once at end of chain

4. **gain for amplitude**: `.gain({ level: envelope })` - level is modulation input