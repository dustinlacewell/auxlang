# Possible Tasks

## Completed

| Task | Description |
|------|-------------|
| ~~Prototype audio engine~~ | ~~AudioWorklet setup, basic oscillator, scheduling~~ ✓ |
| ~~Function inputs (config)~~ | ~~Enable `osc(440).shape(fn)` - functions as device configuration~~ ✓ |
| ~~Unified osc device~~ | ~~Replace saw/lfo with single osc that takes shape function~~ ✓ |
| ~~More oscillator shapes~~ | ~~tri, sqr, noise built on the osc + shape foundation~~ ✓ |
| ~~Type system overhaul~~ | ~~Fully typed `Descriptor<I, C, O>` with compile-time validation~~ ✓ |
| ~~Clock device~~ | ~~`clock(120)` emitting trig/gate at BPM, with swing support~~ ✓ |
| ~~Mini-notation parser~~ | ~~Tokenizer + parser for notes, rests, groups~~ ✓ |
| ~~Sequencer device~~ | ~~`seq("c3 e3 g3")` outputting cv/gate signals~~ ✓ |
| ~~ADSR envelope~~ | ~~`adsr(gate).attack().decay().sustain().release()`~~ ✓ |
| ~~Noise generator~~ | ~~`noise()` white noise with min/max~~ ✓ |
| ~~Delay effect~~ | ~~`delay(input).time().feedback().mix()`~~ ✓ |
| ~~Mix utility~~ | ~~`mix(a).b(b).c(c).d(d)` 4-channel mixer~~ ✓ |
| ~~Core utilities~~ | ~~slew, sah, hpf~~ ✓ |
| ~~Math devices~~ | ~~mult, sub, clip, scale, abs, inv, div, mod~~ ✓ |
| ~~Drum synthesis~~ | ~~kick, snare, hihat, clap~~ ✓ |
| ~~`*n` multiply~~ | ~~Repeat element n times within its time slot~~ ✓ |
| ~~`<a b>` alternation~~ | ~~Cycle through options each pattern cycle~~ ✓ |
| ~~`(k,n)` euclidean~~ | ~~Spread k hits across n steps~~ ✓ |
| ~~`!n` replicate~~ | ~~Expand to n copies taking n time slots~~ ✓ |
| ~~`@n` elongate~~ | ~~Hold note for n time slots~~ ✓ |
| ~~`*<1 2>` multiply w/ alternation~~ | ~~Alternating multiply counts~~ ✓ |
| ~~`_` tie/legato~~ | ~~Tie notes together for legato phrases~~ ✓ |
| ~~clockDiv~~ | ~~Divide clock rate~~ ✓ |
| ~~counter~~ | ~~Count triggers, output current count~~ ✓ |
| ~~Logic devices~~ | ~~gte, lt, and for arrangement gating~~ ✓ |
| ~~`,` stack/chord~~ | ~~`c4,e4,g4` creates polyphonic step with multiple freqs~~ ✓ |
| ~~PolySignal runtime~~ | ~~All signals are `number[]`, runtime normalizes, processor sums~~ ✓ |
| ~~`?` probability~~ | ~~`c4?` = 50% chance; seq rolls dice on step transition~~ ✓ |
| ~~WASM reverb~~ | ~~Dattorro plate reverb in AssemblyScript~~ ✓ |
| ~~WASM filters~~ | ~~Cytomic SVF: lpf, hpf, bpf, notch~~ ✓ |
| ~~Expression-based parser~~ | ~~Replace Beat/Step with Expr tree; stateful AST traversal (D059, D067)~~ ✓ |
| ~~`{}` stack voices~~ | ~~`{a, b, c}` creates voices; nested stacks flatten; probability all-or-nothing (D053-D058, D067)~~ ✓ |
| ~~Per-voice output~~ | ~~`{ cv: PolySignal, gate: PolySignal, trig: PolySignal }` with voice IDs (D066)~~ ✓ |

## In Progress

| Task | Description | Status |
|------|-------------|--------|
| Dynamic voice count | Output only active voices per-sample (D065) | 🔄 Attempted but caused clicks; reverted to output all voices with gate=0 for inactive |

## Target: Port "coastline" by eddyflux

Features needed (in rough priority order):

| Task | Description | Status |
|------|-------------|--------|
| Sample playback | Load and trigger audio files (for drum samples) | 🔲 |
| Chord system | Parse chord names (Bbm9, Fm9) → frequencies | 🔲 |
| Voicing | Spread chord notes across octaves | 🔲 |
| Mask/mute | Gate signals on/off for arrangement | 🔲 |
| Reverb (room) | WASM Dattorro plate reverb | ✅ |
| Native filters | bpf, notch (WASM SVF, in addition to existing lpf/hpf) | ✅ |
| Phaser | All-pass filter chain effect | 🔲 |
| Shape/distortion | Waveshaping distortion | 🔲 |
| FM synthesis | Frequency modulation | 🔲 |
| Perlin noise | Smooth random modulation signal | 🔲 |

## Future

| Task | Description |
|------|-------------|
| Visual language design | Define syntax/semantics for shader/fragment subsystem |
| Desktop wrapper | Tauri vs Electron evaluation |
| Granular synthesis | Grain-based textures |
| Wavetable oscillator | Morphing waveforms |

## Reference

- [features/strudel-pattern-features.md](features/strudel-pattern-features.md) - Analysis of Strudel's pattern system
- [features/implementation-considerations.md](features/implementation-considerations.md) - How features map to our architecture
- [features/feature-backlog.md](features/feature-backlog.md) - Full prioritized backlog
