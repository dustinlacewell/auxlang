# Audio Model Proposal: Eurorack Metaphor + Lazy Descriptors

## Core Insight

The audio system uses a **eurorack modular metaphor**:
- Everything is a continuous signal (voltage)
- Devices have named inputs and outputs
- Patching connects module outputs to inputs
- Clock is just another signal

## Two Layers, One Type

**Continuous signals** are the universal type. The "discrete" layer is just sequencer modules that happen to output steppy signals (sample-and-hold CV, trigger gates).

No mixing of paradigms - sequencers don't know about filters, filters don't know about sequences. They communicate via signals.

## Descriptor Model

User code builds a **lazy DAG of descriptors**, not an immediate audio graph.

### Descriptors are Immutable

```javascript
lfo                     // base descriptor
lfo.rate(4)             // NEW descriptor with rate=4
lfo.rate(4).depth(100)  // NEW descriptor with rate=4, depth=100
```

Each input method returns a new descriptor with a new identity. The original is unchanged.

### Lazy Reification

```javascript
slowLfo = lfo.rate(1)
fastLfo = lfo.rate(10)
unused = osc.pitch(fastLfo.cv)  // descriptor exists but...

out(osc.pitch(slowLfo.cv))      // only slowLfo reified
```

Descriptors are only instantiated as real audio nodes when reachable from `out()`.

### Deduplication by Identity

```javascript
sharedLfo = lfo.rate(2)
v1 = osc.pitch(440).pw(sharedLfo.cv)
v2 = osc.pitch(880).pw(sharedLfo.cv)

out(v1 + v2)  // ONE lfo instance, shared by both oscillators
```

Same descriptor object = same node in final graph.

### New Identity on Mutation

```javascript
baseLfo = lfo.rate(2)
variation = baseLfo.depth(100)  // new object, new identity

out(osc.pw(baseLfo.cv) + osc.pw(variation.cv))  // TWO lfo instances
```

## Sequencer Model

A sequencer module:
- **Input**: Pattern AST (parsed by language) + clock signal
- **Output**: Named signals (gate, cv, accent, step, etc.)

```
                    ┌─────────────┐
  clock signal ───▶ │             │──▶ gate (trigger pulse)
                    │  sequencer  │──▶ cv (held pitch value)
  pattern AST ────▶ │             │──▶ accent (from * in pattern)
                    └─────────────┘
```

Internal behavior:
- Watch clock for rising edges
- On edge: advance step, update cv, emit trigger
- CV is sample-and-hold (constant until next step)
- Gate is brief pulse on each step

## Explicit Routing

No "main" inputs/outputs. Wiring is explicit:

```javascript
melody = seq.pat("c3 e3 g3")
voice = osc.pitch(melody.cv).wave(saw)
shape = env.trig(melody.gate).attack(0.1)
filter = lpf.in(voice * shape).cutoff(800)
out(filter)
```

### Default Output Shorthand

Devices with one obvious output can be used bare:

```javascript
voice * 0.5          // means voice.out * 0.5
lpf.in(voice)        // means lpf.in(voice.out)
```

Multi-output devices (like seq) require explicit output:

```javascript
melody.cv            // required - seq has cv, gate, accent
melody.gate          // must specify which one
```

## Polymorphic Signals

Signals carry channel count. Operations broadcast:

```javascript
seq.pat("[c3,e3,g3]").cv  // 3-channel signal (chord)
osc.pitch(chord.cv)       // 3 oscillators automatically
```

| Operation | Behavior |
|-----------|----------|
| poly + poly (same size) | element-wise |
| poly + mono | mono broadcasts to all channels |
| poly + poly (diff size) | broadcast smaller to larger |

## Clock

Default: global tempo-synced clock. Overridable:

```javascript
seq.pat("c3 e3 g3")                    // global clock
seq.pat("c3 e3 g3").clock(impulse(2))  // 2 Hz
seq.pat("c3 e3 g3").clock(other.gate)  // chain to another seq
```

## Device Definition

Devices declare inputs, outputs, and processing:

```javascript
const lfo = makeDevice({
  name: 'lfo',
  inputs: {
    rate: { default: 1 },
    depth: { default: 1 },
  },
  outputs: ['cv'],
  defaultOutput: 'cv',
  process(inputs, state, sampleRate) {
    state.phase = (state.phase || 0) + inputs.rate / sampleRate
    return {
      cv: Math.sin(state.phase * 2 * Math.PI) * inputs.depth
    }
  }
})
```

`makeDevice` auto-generates:
- `.rate()`, `.depth()` input methods (return new descriptor)
- `.cv` output getter
- Bare reference returns default output

## Benefits

1. **Eurorack mental model**: Familiar to synth users
2. **Lazy evaluation**: Only build what's needed
3. **Automatic sharing**: Same source = same node
4. **JavaScript power**: Loops, functions, conditionals all work
5. **Workshop extensible**: Devices are just JS with a standard interface
6. **Continuous modulation**: Any signal can control any parameter
7. **No magic**: Explicit wiring, clear data flow

## Resolved Questions

1. **Polyphony**: Signals are polymorphic, ops broadcast (D010)
2. **Syntax**: JavaScript with descriptor-returning methods (D011)
3. **Routing**: Explicit `.input(source.output)` (D014)
4. **Default outputs**: Devices can declare one (D016)

## Open Questions

1. **Visual representation**: How does this look in a game UI?
2. **Error handling**: What happens with incompatible connections?
3. **Hot reloading**: How to update graph while playing?
