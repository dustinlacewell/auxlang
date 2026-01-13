# Feature Backlog

Prioritized list of features to implement.

## Status Legend
- **Todo**: Not started
- **In Progress**: Being worked on
- **Done**: Implemented
- **Blocked**: Waiting on something

---

## Tier 0: core2 Completion

| Feature | Status | Notes |
|---------|--------|-------|
| Re-eval state preservation | **In Progress** | Port topology hash, state transfer, WASM serialization, crossfade from v1 |
| Seq precomputation | Todo | Pre-compute sequence to lookup table at expand time; eliminates globalThis.seqTraverse dependency |
| Remove v1 | Blocked | After core2 is feature-complete |

## Tier 1: Core Pattern Power ✅ COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| `*n` multiply/repeat | **Done** | |
| `<a b>` alternation | **Done** | |
| `(k,n)` euclidean | **Done** | |
| `!n` replicate | **Done** | |
| `@n` elongate/hold | **Done** | |
| `_` tie/legato | **Done** | |
| `?` probability | **Done** | |
| Polymetric `{}` | **Done** | |

## Tier 2: Time & Arrangement ✅ COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Clock divider | **Done** | `clockDiv(clk, n)` |
| Clock multiplier | **Done** | `clockMult(clk, n)` |
| Counter device | **Done** | |
| Logic devices | **Done** | `gte`, `lt`, `and`, `or`, `not` |

## Tier 3: Effects

| Feature | Status | Notes |
|---------|--------|-------|
| Reverb | **Done** | WASM Dattorro plate |
| Native filters | **Done** | WASM SVF: lpf, hpf, bpf, notch |
| Tape delay | **Done** | WASM with modulated read |
| Distortion | Todo | Waveshaping |
| Chorus/flanger | Todo | Modulated delay |
| Phaser | Todo | All-pass chain |
| Compressor | Todo | Dynamics |

## Tier 4: Synthesis

| Feature | Status | Notes |
|---------|--------|-------|
| Basic oscillators | **Done** | saw, sin, tri, sqr, noise |
| FM synthesis | Todo | Frequency modulation |
| Wavetable | Todo | Morphing waveforms |
| Karplus-Strong | Todo | Pluck/string |
| Granular | Todo | Grain-based |

## Tier 5: Samples

| Feature | Status | Notes |
|---------|--------|-------|
| Sample loading | Todo | Fetch, decode, buffer |
| Sample playback | Todo | Trigger-based |
| Sample chopping | Todo | Slice into patterns |

## Tier 6: Harmony

| Feature | Status | Notes |
|---------|--------|-------|
| Chord device | **Done** | `chord(root, "maj7")` |
| Spread device | **Done** | Stereo spread |
| Scale quantize | Todo | Snap to scale |
| Voicing | Todo | Spread across octaves |

---

## Decision Log

| Feature | Decision | Rationale |
|---------|----------|-----------|
| Reverb | WASM Dattorro plate | High quality; ~8KB; per-instance state |
| Filters | WASM SVF (Cytomic) | 4 modes; stable at high Q; audio-rate modulation |
| WASM interface | Mono f32→f32 | Simple; TS handles poly; setters for params |
| Probability | `?` in notation | Parser adds prob; seq evaluates at runtime |
| Polyphony | Compile-time expansion | seq/chord/spread expand at API time via expand hooks |
