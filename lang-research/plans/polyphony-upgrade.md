# Polyphony Upgrade Plan (VCV Model)

## Philosophy

Following VCV Rack's approach: **all cables are polyphonic by default**. Mono is just the 1-channel case. This eliminates special-casing and enables automatic polyphony propagation.

> "In Rack, monophonic cables are actually just a special case of polyphonic cables, having just 1 channel. This means there is only one type of cable in Rack: polyphonic."

## Core Concepts

### 1. All Signals Are Multi-Channel

Every signal carries 1-16 channels. There's no distinction between "mono" and "poly" at the type level.

```typescript
// A signal is always an array of channels
// Each channel is a sample value (or array for block processing)
type PolySignal = number[];  // channels[channelIndex] = sample value

// In practice for block processing:
type PolySignalBlock = Float32Array[];  // channels[channelIndex][sampleIndex]
```

### 2. Channel Count Propagates

When a poly signal enters a poly-aware device, the output inherits the channel count:

```
MIDI-CV (8 voices) → VCO → VCF → VCA → Sum → Output
     8 ch          8 ch   8 ch   8 ch   1 ch    1 ch
```

The "chain reaction" means configuring polyphony at the source automatically polyphonizes everything downstream.

### 3. All Devices Are Poly-Aware

Every device processes all channels. There's no "poly-aware" flag - it's just how devices work.

| Device Type | Behavior | Examples |
|-------------|----------|----------|
| **Pass-through** | Output channels = max(input channels) | osc, lpf, env, gain, mult |
| **Source** | Output channels = configured | chordSeq, midiIn |
| **Reducer** | Output channels = 1 | sum |

The channel count is a property of the *signal*, not the device.

### 4. Zero-Channel Signals

A signal with 0 channels acts as "unpatched". Useful for:
- Muting without disconnecting
- Conditional routing
- Virtual patch/unpatch automation

---

## Signal Model

### Current (Mono)

```typescript
// descriptor/types.ts
type Signal = number | number[] | OutputRef;

// runtime - each node output is a scalar
nodeOutputs: Map<string, Record<string, number>>
```

### Proposed (Poly)

```typescript
// descriptor/types.ts
type Signal = number | number[] | OutputRef;  // unchanged at descriptor level

// NEW: Channel count metadata
interface OutputRef {
  readonly descriptorId: DescriptorId;
  readonly outputName: string;
  readonly channels?: number;  // runtime-determined, 1-16
}

// runtime - each node output is array of channels
nodeOutputs: Map<string, Record<string, number[]>>
// e.g., { "osc_1": { out: [0.5, 0.3, 0.7, 0.1] } }  // 4-channel signal
```

### Channel Count Rules

1. **Constant input** (number literal): 1 channel, broadcast to match other inputs
2. **Pass-through device**: output channels = max(input channels)
3. **Source device**: output channels = determined by device logic (e.g., chord note count)
4. **Reducer device**: output channels = 1

---

## Device Implementation

### Pass-Through Device

Most devices simply process all input channels and output the same count:

```typescript
export const saw = device({
  inputs: inputs({ pitch: 440 }),
  outputs: ["out"],

  process(inp, cfg, state, sampleRate) {
    const pitches = inp.pitch;  // number[] - all channels
    const out = pitches.map((pitch, ch) => {
      // Each channel has its own phase state
      state.phase[ch] = state.phase[ch] ?? 0;
      state.phase[ch] += pitch / sampleRate;
      state.phase[ch] %= 1;
      return state.phase[ch] * 2 - 1;
    });
    return { out };
  }
});
```

### Source Device

Generates channels based on configuration:

```typescript
export const chordSeq = device({
  inputs: inputs({ trig: 0 }),
  config: { pattern: () => "<Bbm9 Fm9>" },
  outputs: ["cv", "gate"],

  process(inp, cfg, state, sampleRate) {
    // Parse chord, get frequencies
    const chord = parseChord(cfg.pattern(), state.step);
    const freqs = chord.notes.map(noteToFreq);  // e.g., 5 notes
    const gates = freqs.map(() => state.gateValue);

    return {
      cv: freqs,     // 5 channels
      gate: gates    // 5 channels (or 1 if shared gate)
    };
  }
});
```

### Reducer Device

Collapses all channels to one:

```typescript
export const sum = device({
  inputs: inputs({ in: 0 }),
  outputs: ["out"],

  process(inp) {
    const channels = inp.in;  // number[]
    const summed = channels.reduce((a, b) => a + b, 0);
    const normalized = summed / Math.sqrt(channels.length);  // √n normalization
    return { out: [normalized] };  // 1 channel
  }
});
```

---

## Utility Devices

Following VCV's utilities, but using our device conventions (first arg = signal input, config via chained methods):

### `split` - Poly to Multiple Mono Outputs

```typescript
// Split a poly signal into individual mono outputs
const poly = chordSeq("<Cm7>");  // 4 channels
const s = split(poly.cv);
// s.ch0, s.ch1, s.ch2, ... s.ch15 are each 1-channel signals
// Unoccupied channels output 0
```

### `merge` - Multiple Mono to Poly

```typescript
// Merge mono signals into one poly signal
// Uses fixed inputs like mix() does
const merged = merge(osc1.out).b(osc2.out).c(osc3.out);
// merged.out is 3-channel signal
```

### `sum` - Poly to Mono (Mix)

```typescript
// Unity mix all channels to mono
const mono = sum(polySignal);
// mono.out is 1-channel signal
```

### `take` - Limit Channel Count

```typescript
// Take first N channels
const limited = take(poly.cv).n(2);  // first 2 channels only
```

---

## Broadcasting Rules

When signals with different channel counts meet:

### Input Broadcasting

If a device receives inputs with different channel counts:

```typescript
const osc = saw(poly.cv);      // 4 channels
const filtered = lpf(osc.out)  // 4 channels
  .cutoff(500);                // 1 channel (constant) → broadcast to 4
```

Rule: **Scalars/mono broadcast to match the highest channel count.**

### Mismatched Poly Inputs

```typescript
const a = chordSeq("<Cm7>");   // 4 channels
const b = chordSeq("<G7>");    // 4 channels
const mixed = add(a.cv, b.cv); // 4 channels (element-wise add)
```

If channel counts differ:
- Option A: Error (explicit is better)
- Option B: Use min(channels) and warn
- **Option C: Use max(channels), shorter input wraps** ← VCV behavior

---

## Implementation Phases

### Phase 1: Runtime Poly Support

1. Change `nodeOutputs` to store `number[]` instead of `number`
2. Update `resolveInputs` to handle channel arrays
3. Add broadcasting logic (mono → poly expansion)
4. Update existing devices to work with arrays (mostly mechanical)

**Files to modify:**
- [runtime/processor.ts](src/runtime/processor.ts) - core signal handling
- [runtime/compile.ts](src/runtime/compile.ts) - preserve array defaults
- [graph/reify.ts](src/graph/reify.ts) - channel count propagation

### Phase 2: Device Updates

Update all devices to be poly-aware:
- Oscillators: saw, osc, tri, sqr, noise
- Envelopes: env, adsr
- Filters: lpf, hpf
- Effects: delay, gain
- Math: mult, add, sub, etc.

Most changes are mechanical: wrap scalar logic in a channel loop.

### Phase 3: Poly Utilities

Add utility devices:
- `split(signal, n)` - poly to mono array
- `merge(...signals)` - mono array to poly
- `sum(signal)` - poly to mono (mix)
- `channels(signal, n?)` - get/limit channels

### Phase 4: Poly Sources

Add devices that generate polyphony:
- `chordSeq` - chord pattern sequencer
- `midiIn` - MIDI input with voice allocation
- `voicer` - voice allocation utility

---

## Example: Polyphonic Synth Patch

```typescript
const clk = clock(120);
const ch = chordSeq("<Bbm9 Fm9>/4").trig(clk.trig);  // 5 voices

// Everything downstream is automatically 5-channel
const osc = saw(ch.cv);
const env = adsr(ch.gate).a(0.01).d(0.1).s(0.7).r(0.3);
const voiced = mult(osc.out).b(env.out);
const filtered = lpf(voiced).cutoff(lfo(0.5).min(400).max(2000));

// Collapse to mono for output
const mixed = sum(filtered);
out(gain(mixed).level(0.3));
```

Compare to the cumbersome manual approach:
```typescript
// WITHOUT poly cables - need 5x everything manually
const voices = [0,1,2,3,4].map(i => {
  const cv = ch.cv[i];  // ugly indexing
  const gate = ch.gate[i];
  const osc = saw(cv);
  const env = adsr(gate);
  return mult(osc.out).b(env.out);
});
const mixed = mix(voices[0]).b(voices[1]).c(voices[2]).d(voices[3]);
// can't even fit 5 voices in 4-channel mix!
```

---

## Performance Considerations

VCV Rack achieves 4x speedup with poly devices via SIMD. We can do similar:

```typescript
// Naive (slow)
process(inp) {
  return { out: inp.pitch.map(p => Math.sin(p * TAU)) };
}

// SIMD-friendly (fast) - future optimization
process(inp) {
  const out = new Float32Array(inp.pitch.length);
  // Use SIMD intrinsics or let V8 auto-vectorize
  for (let i = 0; i < inp.pitch.length; i++) {
    out[i] = Math.sin(inp.pitch[i] * TAU);
  }
  return { out };
}
```

For now, the naive approach is fine. Optimize later if needed.

---

## Open Questions

1. **Max channels**: VCV uses 16. Is that enough? (Yes, even 3rd-order ambisonics fits in 16)

2. **Channel count at compile time vs runtime**:
   - Compile time: simpler, but limits dynamic voice allocation
   - Runtime: more flexible, but complicates graph compilation
   - **Recommendation**: Runtime, like VCV

3. **State per channel**: Each channel needs its own oscillator phase, filter state, etc.
   - Solution: State becomes `state[channelIndex].phase` or `state.phase[channelIndex]`

4. **Zero-channel behavior**: Should we support 0-channel signals for virtual unpatch?
   - Yes, it's elegant and useful for muting

---

## Migration Strategy

1. All existing patches continue to work (1-channel = mono)
2. New poly-source devices enable polyphony
3. Existing devices become poly-aware incrementally
4. No breaking changes to user code

---

## References

- [VCV Rack Polyphony Documentation](https://vcvrack.com/manual/Polyphony)
- [Doepfer A-180-9 Multicore](http://www.doepfer.de/a1809.htm) - hardware inspiration
- Strudel's approach (pattern-level, not signal-level - different paradigm)
