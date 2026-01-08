# Native WASM Modules

This document outlines which devices would benefit from native WASM implementations vs staying in JavaScript.

## Decision Criteria

**Port to WASM when:**
- Per-sample DSP with tight loops (filters, delays with interpolation)
- Large stateful buffers (reverbs, delays, convolution)
- Numerical precision matters (filters near nyquist, feedback systems)
- CPU-intensive algorithms (physical modeling, oversampling)

**Keep in JS when:**
- Simple arithmetic (gain, add, mult)
- Control-rate logic (sequencers, clocks, counters)
- Minimal state (basic oscillators)
- Needs JS features (random, string parsing)

## Priority Tiers

### Tier 1: High Impact (Port Now)

#### Filters: `lpf`, `hpf`, `bpf`, `notch`
- **Why**: State-variable filters with feedback benefit from tight WASM loops
- **Approach**: Single SVF (state-variable filter) implementation, mode-switchable
- **Inputs**: `input`, `cutoff`, `resonance`
- **Bonus**: Could add filter types (ladder, Moog-style) not feasible in JS

#### Delay with Interpolation
- **Why**: Current JS delay is basic; proper interpolation for pitch-shifting needs precision
- **Approach**: Cubic or all-pass interpolation, modulation input
- **Inputs**: `input`, `time`, `feedback`, `mix`
- **Enables**: Better chorus, flanger, pitch shifting

#### Compressor/Limiter
- **Why**: Envelope following + gain computation per sample
- **Approach**: Feed-forward design with adjustable knee
- **Inputs**: `input`, `threshold`, `ratio`, `attack`, `release`, `makeup`

### Tier 2: Medium Impact (Port Soon)

#### Chorus
- **Why**: Multiple modulated delay lines, LFOs, mixing
- **Approach**: 2-4 voice chorus with independent LFOs
- **Inputs**: `input`, `rate`, `depth`, `mix`, `voices`

#### Flanger/Phaser
- **Why**: Modulated comb/allpass chains
- **Approach**: Flanger = modulated comb; Phaser = cascaded allpass
- **Inputs**: `input`, `rate`, `depth`, `feedback`, `mix`

#### Distortion/Saturation
- **Why**: Oversampling for alias-free distortion
- **Approach**: 2-4x oversampling + waveshaping + anti-alias filter
- **Inputs**: `input`, `drive`, `tone`, `mix`
- **Types**: soft clip, hard clip, tube, tape, foldback

#### Bitcrusher
- **Why**: Sample rate reduction + bit depth reduction
- **Approach**: Hold-and-decimate + quantize
- **Inputs**: `input`, `bits`, `downsample`

### Tier 3: Specialized (Port Later)

#### Physical Modeling

**Karplus-Strong (plucked string)**
- Delay line + lowpass feedback
- **Inputs**: `trigger`, `frequency`, `decay`, `brightness`

**Waveguide String**
- Bidirectional delay lines with termination filters
- More realistic than K-S

**Modal Synthesis**
- Bank of resonant filters for bell/bar sounds
- **Inputs**: `trigger`, `frequency`, `decay`, `material`

#### Granular Engine
- **Why**: Many simultaneous grains, each with envelope + playback
- **Approach**: Grain pool with scheduling
- **Inputs**: `input` (or buffer), `position`, `size`, `density`, `pitch`, `spread`

#### Convolution (small IRs)
- **Why**: Short impulse responses for cabinet simulation
- **Approach**: Partitioned convolution for low latency
- **Inputs**: `input`, `mix`
- **Note**: IR would need to be baked in or loaded separately

#### Vocoder
- **Why**: Multiple bandpass filters + envelope followers
- **Approach**: 8-16 band analysis/synthesis
- **Inputs**: `carrier`, `modulator`, `bands`

### Tier 4: Not Worth Porting

These should stay in JS:

| Device | Reason |
|--------|--------|
| `osc`, `saw`, `sin`, `tri`, `sqr` | Simple phase + waveform, JS is fine |
| `noise` | Just `Math.random()` |
| `env`, `adsr` | State machine, minimal math |
| `gain`, `add`, `mult`, `mix` | Trivial operations |
| `seq`, `clock`, `counter` | Control logic, not DSP |
| `slew` | Simple one-pole, not worth overhead |
| `sah` | Sample-and-hold is trivial |

## Architecture Considerations

### One WASM Module vs Many

**Option A: One big module**
- Single `native.wasm` with all devices
- Pros: One fetch, shared utilities
- Cons: Loads everything even if unused

**Option B: Per-device modules**
- `reverb.wasm`, `filter.wasm`, `delay.wasm`
- Pros: Load only what's needed
- Cons: Multiple fetches, code duplication

**Recommendation**: Start with one module, split later if size becomes an issue.

### State Management

Each WASM device needs:
```
init(sampleRate) -> void
process(input) -> output
set_<param>(value) -> void
clear() -> void  // reset state
```

For devices with multiple inputs (e.g., vocoder with carrier + modulator), consider:
```
process2(input1, input2) -> output
// or
set_carrier(value), set_modulator(value), process() -> output
```

### Polyphony

Current architecture: Each node instance gets its own WASM instance.

For polyphonic use:
- WASM instance is per-node, not per-voice
- Polyphony handled at graph level (multiple osc nodes feeding one filter)
- This works but may want voice-aware WASM devices later

## Implementation Order

1. **SVF Filter** - Most used, good test case
2. **Interpolating Delay** - Enables chorus/flanger
3. **Chorus** - Popular effect, uses delay
4. **Compressor** - Essential for mixing
5. **Distortion** - Needs oversampling expertise
6. **Physical modeling** - Fun but specialized

## Open Questions

- Should WASM devices support audio-rate modulation of all params, or just some?
- How to handle devices that need buffers (granular, convolution)?
- Should we expose more reverb algorithms (spring, room, hall)?
