# Auxlang User Guide

A systematic guide to the Auxlang audio programming language.

---

## 1. Fundamentals

### What is Auxlang?

Auxlang is a JavaScript-embedded language for creating audio. You write JavaScript that describes audio graphs, and the runtime plays them in real-time.

### Hello World

```javascript
saw(440).out()
```

This creates a sawtooth oscillator at 440 Hz and sends it to the speakers.

### The Basic Flow

1. Create devices (oscillators, filters, effects)
2. Connect them together with chaining
3. Call `.out()` to hear the result

---

## 2. Devices

Devices are the building blocks. Each device processes audio or control signals.

### Creating Devices

```javascript
// Just the device with defaults
saw()

// Positional argument
saw(440)

// Named parameters
saw({ freq: 440 })

// Method chaining
saw().freq(440)
```

All of these create the same thing: a sawtooth oscillator at 440 Hz.

### Device Categories

**Sources** - Generate sound
- `saw`, `sin`, `tri`, `sqr` - Oscillators (input: freq)
- `noise` - White noise
- `lfo` - Low frequency oscillator (input: rate)

**Filters** - Shape the sound
- `lpf`, `hpf`, `bpf`, `notch` - Filters (inputs: input, cutoff, resonance)

**Envelopes** - Shape volume over time
- `adsr` - Full envelope (inputs: gate, attack, decay, sustain, release)
- `env` - Simple AR envelope (inputs: gate, attack, release)

**Effects**
- `delay` - Echo (inputs: input, time, feedback, mix)
- `reverb` - Room simulation (inputs: input, mix, decay)
- `tape` - Tape delay with modulation

**Drums**
- `kick`, `snare`, `hihat`, `clap` - Drum sounds (input: gate)

**Utilities**
- `gain` - Volume control (inputs: input, level)
- `mix` - Mix signals together
- `scale` - Map value ranges

**Math**
- `add`, `sub`, `mult`, `div`, `clip`, `abs`, `inv`, `mod`

**Timing**
- `clock` - Master clock (input: bpm)
- `seq` - Pattern sequencer
- `clockDiv`, `clockMult` - Clock manipulation

---

## 3. Signals

Signals are values that flow between devices.

### Numbers

Constant values:
```javascript
saw(440)              // frequency in Hz
gain({ level: 0.5 })  // amplitude 0-1
```

### Device Outputs

Reference another device's output:
```javascript
let s = seq("c4 e4")
saw(s.cv)       // pitch output
adsr(s.gate)    // gate output
```

### Devices as Signals

A device can be used directly - it uses its main output:
```javascript
let s = seq("c4 e4")
saw(s)          // same as saw(s.cv)
```

### Lambdas

Custom functions that run every sample:
```javascript
saw((state, sampleRate, time) => {
  return 200 + Math.sin(time * 2) * 100
})
```

- `state` - Store values between samples
- `sampleRate` - Usually 44100 or 48000
- `time` - Seconds since playback started

---

## 4. Chaining

Chaining connects devices together. It's the core of Auxlang's syntax.

### Basic Chaining

```javascript
saw(440).lpf()
```

The oscillator's output connects to the filter's input.

### Chaining with Parameters

```javascript
saw(440).lpf({ cutoff: 800 })
saw(440).lpf().cutoff(800)  // equivalent
```

### Positional Arguments

When chaining, positional arguments fill inputs in order:
```javascript
clock(120).seq("c4 e4")
// clock -> seq's clock input
// "c4 e4" -> seq's pattern
```

### Explicit Output Selection

Pick which output to chain from:
```javascript
let s = seq("c4 e4")
s.cv.saw()      // pitch -> oscillator
s.gate.adsr()   // gate -> envelope
```

### Full Example

```javascript
clock(120).seq("c4 e4 g4").saw().lpf({ cutoff: 800 }).out()
```

1. `clock(120)` - 120 BPM clock
2. `.seq("c4 e4 g4")` - Sequencer receives clock, plays pattern
3. `.saw()` - Oscillator receives pitch
4. `.lpf({ cutoff: 800 })` - Filter receives audio
5. `.out()` - Send to speakers

---

## 5. Immutability

**Methods return new devices.** The original is unchanged.

### Wrong

```javascript
let osc = saw(440)
osc.freq(880)      // Creates new device, discards it
osc.out()          // Still 440 Hz!
```

### Right

```javascript
let osc = saw(440)
let osc2 = osc.freq(880)  // Capture the new device
osc2.out()                // 880 Hz
```

### Why This Matters

When referencing a device multiple times:

```javascript
// WRONG - s doesn't have the clock yet
let s = seq("c4 e4")
s.clk(clock(120)).saw().gain({ level: s.gate.adsr() }).out()

// RIGHT - capture after adding clock
let s = seq("c4 e4").clk(clock(120))
s.saw().gain({ level: s.gate.adsr() }).out()
```

---

## 6. Modulation

Modulation connects control signals to parameters.

### Basic Modulation

```javascript
let wobble = lfo(2)  // 2 Hz LFO
saw(440).lpf({ cutoff: wobble }).out()
```

### Scaling

LFO outputs -1 to +1. Use `scale` to map to useful ranges:
```javascript
let mod = lfo(0.5).scale({ from: -1, to: 1, min: 200, max: 2000 })
saw(440).lpf({ cutoff: mod }).out()
```

### Envelope Modulation

Control amplitude with an envelope:
```javascript
let s = seq("c4 e4").clk(clock(120))
let env = s.gate.adsr()
s.saw().gain({ level: env }).out()
```

### Lambda Modulation

For custom modulation:
```javascript
saw(440).lpf({
  cutoff: (state, sr, time) => 500 + Math.sin(time * 4) * 300
}).out()
```

---

## 7. The Sequencer

The sequencer plays patterns. It outputs pitch, gate, and trigger signals.

### Basic Usage

```javascript
seq("c4 e4 g4").clk(clock(120)).saw().out()
```

### Outputs

- `cv` - Pitch as frequency (main output)
- `gate` - High while note plays
- `trig` - Short pulse at note start

### Clock Connection

The sequencer needs a clock:
```javascript
let c = clock(120)
seq("c4 e4").clk(c)       // Method
clock(120).seq("c4 e4")   // Or chain
```

### Pattern Syntax

**Notes and Rests:**
```
c4        Note (pitch + octave)
c#4       Sharp
bb3       Flat
~         Rest
```

**Time:**
```
c4*4      Repeat 4x within same time
c4!4      Repeat 4x (extends duration)
c4@4      Hold across 4 beats
```

**Grouping:**
```
[c4 e4]   Subdivide within one beat
<c4 d4>   Alternate each loop
c4_e4     Tie (legato)
```

**Probability:**
```
c4?       50% chance
c4?.75    75% chance
```

**Euclidean:**
```
(3,8)     3 hits across 8 steps
```

**Chords:**
```
{c4,e4,g4}  Play simultaneously
```

---

## 8. Polyphony

Polyphony is playing multiple notes at once.

### In Patterns

```javascript
seq("{c4,e4,g4}").saw().out()  // 3-note chord
```

### The Chord Device

Build chords from a root note:
```javascript
chord(261.63, "maj").saw().out()   // C major
chord(220, "min7").sin().out()     // A minor 7th
```

Types: `maj`, `min`, `dim`, `aug`, `sus2`, `sus4`, `maj7`, `min7`, `dom7`, etc.

### Chaining on Chords

Operations apply to all voices:
```javascript
seq("{c4,e4,g4}").saw().lpf({ cutoff: 800 }).out()
// 3 oscillators, each filtered
```

### Accessing Voices

```javascript
let chord = seq("{c4,e4,g4}").saw()
chord.voices[0]   // First voice
chord.voices[1]   // Second voice
```

---

## 9. Variables and Apply

### When to Use Variables

When you need to reference the same device twice:
```javascript
let s = seq("c4 e4").clk(clock(120))
s.saw().gain({ level: s.gate.adsr() }).out()
//                    ^ referencing s again
```

### The Apply Pattern

Bind variables mid-chain:
```javascript
clock(120).apply(c =>
  seq("c4 e4 g4").clk(c).apply(s =>
    s.saw().gain({ level: s.gate.adsr() }).out()
  )
)
```

---

## 10. Output

### The out() Function

`.out()` sends audio to the speakers:
```javascript
saw(440).lpf({ cutoff: 800 }).out()
```

### Multiple Outputs

Layer sounds with multiple `.out()` calls:
```javascript
// Bass
seq("c2 c2 g2 g2").clk(clock(120)).saw().lpf({ cutoff: 400 }).out()

// Lead
seq("c4 e4 g4 b4").clk(clock(120)).sin().out()
```

### Terminal

`.out()` ends the chain. Don't chain after it.

---

## 11. Common Patterns

### Basic Synth

```javascript
let s = seq("c3 e3 g3").clk(clock(120))
s.saw()
  .lpf({ cutoff: 1000 })
  .gain({ level: s.gate.adsr() })
  .out()
```

### Drums

```javascript
let c = clock(120)
kick(seq("c1 ~ c1 ~").clk(c).gate).out()
hihat(seq("[c1 c1] [c1 c1]").clk(c).gate).out()
snare(seq("~ c1 ~ c1").clk(c).gate).out()
```

### Modulated Pad

```javascript
let mod = lfo(0.3).scale({ from: -1, to: 1, min: 400, max: 1200 })
seq("{c3,e3,g3,b3}").clk(clock(60))
  .saw()
  .lpf({ cutoff: mod, resonance: 0.3 })
  .gain({ level: 0.15 })
  .reverb({ mix: 0.4 })
  .out()
```

### Arpeggio

```javascript
clock(240).seq("c4 e4 g4 b4 g4 e4")
  .saw()
  .lpf({ cutoff: 2000 })
  .delay({ time: 0.15, feedback: 0.5, mix: 0.3 })
  .out()
```

### Chord Progression

```javascript
let c = clock(60)
seq("c3 f3 g3 c3").clk(c).cv
  .chord("maj")
  .saw()
  .lpf({ cutoff: 800 })
  .gain({ level: 0.15 })
  .reverb({ mix: 0.3 })
  .out()
```

---

## 12. Troubleshooting

### No Sound

1. Did you call `.out()`?
2. Is the sequencer clocked? `.clk(clock(bpm))`
3. Is gain too low?

### Wrong Notes

Check variable timing:
```javascript
// WRONG
let s = seq("c4")
s.clk(clock(120)).saw().gain({ level: s.gate.adsr() })

// RIGHT
let s = seq("c4").clk(clock(120))
s.saw().gain({ level: s.gate.adsr() })
```

### Clicking

Use envelopes:
```javascript
// Clicks
saw(440).out()

// Smooth
let s = seq("c4").clk(clock(120))
s.saw().gain({ level: s.gate.adsr() }).out()
```

### Filter Not Moving

Scale your modulation:
```javascript
// Wrong - LFO is -1 to 1
saw(440).lpf({ cutoff: lfo(2) }).out()

// Right - scale to Hz
let mod = lfo(2).scale({ from: -1, to: 1, min: 200, max: 2000 })
saw(440).lpf({ cutoff: mod }).out()
```
