# Feature Backlog

Prioritized list of features to consider implementing.

## Status Legend
- **Todo**: Not started
- **In Progress**: Being worked on
- **Done**: Implemented
- **Deferred**: Decided to skip or delay
- **Research**: Needs more design work

---

## Tier 1: Core Pattern Power ✅ COMPLETE

These unlock basic musical variation and are expected by users familiar with live-coding.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| `*n` multiply/repeat | **Done** | Medium | Parser + subdivide time |
| `<a b>` alternation | **Done** | Medium | Parser + cycle tracking in seq |
| `(k,n)` euclidean | **Done** | Medium | Parser + euclidean algorithm (Bjorklund) |
| `!n` replicate | **Done** | Low | Parser only, expands to copies |
| `@n` elongate/hold | **Done** | Low | Parser + duration tracking |
| `*<1 2>` alt multiply | **Done** | Medium | Alternating multiply counts (bonus!) |
| `_` tie/legato | **Done** | Medium | Ties notes together, gate stays high |

## Tier 2: Time & Arrangement ✅ COMPLETE

These enable longer-form pieces and structural variation.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| Clock divider | **Done** | Low | `clockDiv(clk, n)` |
| Counter device | **Done** | Low | Counts triggers, outputs count |
| Logic devices | **Done** | Low | `gte`, `lt`, `and` for arrangement gating |
| Clock multiplier | Todo | Low | New device |
| Mask/mute | Research | Medium | How to express arrangement? |
| Phase offset | Todo | Low | Shift clock phase |

## Tier 3: Randomness & Variation

These add life and unpredictability.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| `?` probability in notation | **Done** | Low | Parser adds `prob` field; seq rolls dice on step transition |
| `pick(a, b, prob)` device | **Design Ready** | Low | Probabilistic S&H; re-rolls on trigger; eurorack approach to `rarely`/`sometimes` |
| Perlin noise | Todo | Medium | Smooth random signal |

## Tier 4: Effects & Sound Design

Audio processing beyond filtering.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| Reverb | **Done** | High | WASM Dattorro plate reverb (~8KB) |
| Native filters | **Done** | Medium | WASM SVF: lpf, hpf, bpf, notch |
| Distortion/overdrive | Todo | Low | Waveshaping |
| Chorus/flanger | Todo | Medium | Modulated delay |
| Phaser | Todo | Medium | All-pass filter chain |
| Compressor | Todo | Medium | Dynamics |
| FM synthesis | Todo | Medium | Frequency modulation |
| Ring modulation | **Done** | Low | `mult` multiplies two signals |

## Tier 5: Advanced Pattern

Complex transformations and composition.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| `.rev()` reverse | Todo | Low | Reverse pattern order |
| `.chunk()` section transform | Research | High | Apply function to pattern sections |
| Polymetric `{}` | **Done** | High | Expression-based parser complete; `{a b c, d e}` = polyrhythm; D053-D059, D067 |
| Pattern stacking / chords | **Done** | High | `{c4,e4,g4}` creates voices; stack probability works correctly (all-or-nothing) |
| Conditionals | Research | Medium | if/else in patterns? |

## Tier 6: Samples & Playback

Audio file support.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| Sample loading | Todo | High | Fetch, decode, buffer management |
| Sample playback device | Todo | Medium | Trigger-based player |
| Sample chopping | Research | High | Slice samples into patterns |
| Time-stretching | Research | Very High | Pitch-independent tempo |

## Tier 7: Synthesis

Additional synthesis methods.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| Wavetable oscillator | Todo | Medium | Morphing waveforms |
| Karplus-Strong (pluck) | Todo | Medium | Physical modeling |
| Formant filter | Todo | Medium | Vowel sounds |
| Granular synthesis | Research | High | Grain-based textures |

## Tier 8: Harmony & Chords

Music theory helpers.

| Feature | Status | Complexity | Notes |
|---------|--------|------------|-------|
| Chord parser | Todo | Medium | "Bbm9" → array of frequencies |
| Voicing | Todo | Medium | Spread notes across octaves |
| Scale quantize | Todo | Low | Snap to nearest scale degree |

---

## Target: Port "coastline" by eddyflux

Priority features for porting the target song:

1. ✅ **Reverb** - `.room()` effect (WASM Dattorro plate reverb)
2. ✅ **Native filters** - lpf/hpf/bpf/notch (WASM SVF)
3. **Sample playback** - drums use 'crate' sample bank
4. **Chord/voicing system** - `chord("<Bbm9 Fm9>/4")`
5. **Mask/mute** - `.mask()` for arrangement sections
6. **Phaser** - `.phaser()` effect
7. **FM synthesis** - `.fm()` modulation
8. **Perlin noise** - smooth random for gain modulation

---

## Decision Log

| Feature | Decision | Rationale |
|---------|----------|-----------|
| `_` tie | Implemented as binary operator | Cleaner than Strudel's `@` overloading; combines with `slew` for glide |
| Ring mod | Already done | `mult` device multiplies two audio signals |
| Reverb | WASM Dattorro plate | High quality algorithm; ~8KB module; per-instance state; JS fallback included |
| Filters | WASM SVF (Cytomic) | 4 modes from one algorithm; stable at high resonance; audio-rate modulation ready |
| WASM architecture | Per-node instantiation | Each device gets own WASM instance; enables independent filter/reverb state |
| WASM interface | Mono f32→f32 | Simple interface; TypeScript handles polyphony; setter functions for params |
| `?` probability | Notation-level | Parser adds `prob` field to step; seq evaluates at runtime; `c3?` = 50% chance |
| `rarely`/`sometimes`/`often` | `pick` device | Strudel's version modifies synth params per-cycle; our equivalent is `pick(a, b, prob).trig(t)` - probabilistic S&H |
| `struct` | TBD | Strudel uses `keepif.out` - struct pattern provides rhythm, main provides pitch; needs more design |
| `mask` | TBD | Strudel uses `keepif.in` - main pattern structure preserved, masked where pattern is 0 |
| `stack` | Notation-level `{}` | D053-D059: `{a, b, c}` creates voices in notation; each branch = 1 voice; nested stacks flatten |
| Expression-based parser | In progress | D059: Replace Beat/Step with Expr tree; enables arbitrary nesting of all operators |
| Voice output shape | Parallel arrays | D058: `{ cv: number[], gate: number[], trig: number[] }` indexed by voice ID |

(Record decisions about whether to implement, skip, or modify features here)
