# Context Letter for New Chat

## Project: Uzulang - Live-coding language for Steam game

### Goal
Create a new live-coding language for audio and visuals, targeting a Steam game release. Must be clean-room implementation (no AGPL/GPL code from Strudel, Punctual, or Kabelsalat).

### Current Status: Full Synth Engine + Mini-Notation + Polyphony + Live Re-eval

The audio engine is **functional** in `auxlang/`. Run with: `cd auxlang && pnpm dev`

**What's implemented:**

Core System:
- Descriptor system with proxy-based lazy evaluation
- **Fully typed descriptors**: `Descriptor<I, C, O>` with compile-time validation
- Graph reification (DAG → topologically-sorted nodes)
- AudioWorklet runtime with serialized/hydrated process functions
- Config system for function inputs (waveshapers, etc.)
- **Polyphonic signals**: All signals are `PolySignal = number[]`; runtime normalizes scalars
- **Live re-evaluation**: Topology-based state preservation + 100ms crossfade
- **WASM support**: Native devices via AssemblyScript → WebAssembly with JS fallbacks
- Tests passing, 0 type errors

Devices:
- **Oscillators**: osc (sine), saw, sawOsc, tri, sqr, noise, lfo
- **Drums**: kick, snare, hihat, clap (synthesized, 808-style, no samples)
- **Sequencing**: clock (BPM + swing), seq (mini-notation → cv/gate), clockDiv, counter
- **Envelopes**: env (AR), adsr (full ADSR)
- **Filters**: lpf, hpf, bpf, notch (WASM SVF with JS fallback)
- **Effects**: delay (with feedback, dry/wet), reverb (WASM Dattorro plate reverb)
- **Utilities**: gain, add, mix (4-ch), slew (portamento), sah (sample-and-hold)
- **Math**: mult, sub, clip, scale, abs, inv, div, mod
- **Logic**: gte, lt, and (for arrangement gating)

WASM Native Devices:
- **Reverb**: Dattorro plate reverb algorithm (~8KB WASM, 310-line AssemblyScript)
  - Parameters: room (tail), damp (HF absorption), wet, dry
  - Uses allpass diffusion + dual-tank with cross-feedback
- **Filters**: Cytomic SVF (state-variable filter) supporting 4 modes
  - lpf, hpf, bpf, notch - all use same `filter.wasm` module
  - Parameters: cutoff (Hz), resonance (0-1), mode
  - Stable at high resonance, supports audio-rate modulation

Mini-notation (REDESIGNING FOR EXPRESSION-BASED PARSER):
- Notes: `c3`, `c#4`, `db2` (case insensitive, octave optional defaults to 4)
- Rests: `~`
- Groups/subdivision: `[c3 e3]` - subdivide time equally
- **Multiply**: `c3*2` - repeat within same time slot (subdivides)
- **Replicate**: `c3!3` - expand to 3 copies taking 3 time slots
- **Elongate**: `c3@4` - hold for 4 time slots
- **Alternation**: `<c3 e3 g3>` - cycle through options each pattern loop
- **Euclidean**: `c3(3,8)` - spread 3 hits over 8 steps (Bjorklund algorithm)
- **Combo**: `c3*<1 2>` - multiply with alternating counts
- **Nesting**: `[c3 [e3 g3]]` - groups can nest arbitrarily
- **Tie/Legato**: `c3_g3` - gate stays high across children, pitch changes at transitions
- **Stack/Chords**: `{c4,e4,g4}` - creates 3 voices, each holds for full duration
- **Maybe/Probability**: `c3?` - 50% chance to play (rolls dice on step transition)

**Expression-Based Parser (D053-D059, D067)** - COMPLETE:
- **Voice creation**: Only stacks create voices (one per branch)
- **Nested stacks flatten**: `{c4, {a4, b4}, g4}` = 4 voices
- **Stack branch duration**: Each branch independently fills the stack's allocated duration
- **Polyrhythm**: `{c4 d4 e4, f4 g4}` = 3:2 (branches subdivide independently)
- **Voice IDs**: Assigned to branches, not notes; stable for pattern lifetime
- **Output shape**: `{ cv: PolySignal, gate: PolySignal, trig: PolySignal }` with voice IDs
- **Stateful AST traversal**: Replaced flattened events with per-sample tree walk
- **Probability semantics**: `{c4,e4,g4}?0.5` rolls once for entire stack (all-or-nothing)
- **√n normalization**: Polysignal mixdown uses perceptually balanced mixing (D068)

Live Re-evaluation:
- **Topology matching**: Nodes identified by device type + connections (not config)
- **State preservation**: Clock phase, seq position, oscillator phases transfer across swaps
- **Seq beat sync**: Pattern changes queue until next beat (trigger rising edge)
- **100ms crossfade**: Old graph fades out while new graph fades in
- **Test page**: `/live-reeval.html` for interactive A/B testing

### The Audio Model

**Eurorack metaphor**: Everything is a signal. Sequencers are modules that output cv/gate. Downstream is all continuous signal processing.

**Key insight vs Strudel**: Strudel's model is `Pattern → Events → Fixed Synth`. Our model factors the sequencer out: `Clock → Seq → CV/Gate → [any devices]`. This gives us continuous modulation (LFOs on filter cutoff etc) that Strudel can't do.

### Target Song: "coastline" by eddyflux

We're working toward porting this Strudel song to our system:

```javascript
// "coastline" @by eddyflux - Strudel version
samples('github:eddyflux/crate')
setcps(.75)
let chords = chord("<Bbm9 Fm9>/4").dict('ireal')
stack(
  stack( // DRUMS
    s("bd").struct("<[x*<1 2> [~@3 x]] x>"),
    s("~ [rim, sd:<2 3>]").room("<0 .2>"),
    n("[0 <1 3>]*<2!3 4>").s("hh"),
    s("rd:<1!3 2>*2").mask("<0 0 1 1>/16").gain(.5)
  ).bank('crate')
  .mask("<[0 1] 1 1 1>/16".early(.5))
  , // CHORDS
  chords.offset(-1).voicing().s("gm_epiano1:1")
  .phaser(4).room(.5)
  , // MELODY
  n("<0!3 1*2>").set(chords).mode("root:g2")
  .voicing().s("gm_acoustic_bass"),
  chords.n("[0 <4 3 <2 5>>*2](<3 5>,8)")
  .anchor("D5").voicing()
  .segment(4).clip(rand.range(.4,.8))
  .room(.75).shape(.3).delay(.25)
  .fm(sine.range(3,8).slow(8))
  .lpf(sine.range(500,1000).slow(8)).lpq(5)
  .rarely(ply("2")).chunk(4, fast(2))
  .gain(perlin.range(.6, .9))
  .mask("<0 1 1 0>/16")
)
.late("[0 .01]*4").late("[0 .01]*2").size(4)
```

**Features needed to port this:**
1. ✅ Mini-notation operators: `*`, `@`, `!`, `<>`, euclidean `(k,n)`
2. ✅ Clock/sequencing basics
3. ✅ Tie/legato syntax `_`
4. ✅ Live re-evaluation (seamless code changes during playback)
5. ✅ Reverb (`.room()` - WASM Dattorro plate reverb)
6. ✅ Native filters: lpf, hpf, bpf, notch (WASM SVF)
7. 🔲 Sample playback (for drum samples from 'crate' bank)
8. 🔲 Chord/voicing system (chord names → frequencies)
9. 🔲 Mask/mute (`.mask()` for arrangement)
10. 🔲 Stacking/layering (`stack()`)
11. 🔲 Effects: phaser, shape (distortion)
12. 🔲 FM synthesis
13. 🔲 Perlin noise for modulation
14. 🔲 Pattern transformations: `.rarely()`, `.chunk()`, `.segment()`, `.clip()`

### Files Structure
```
auxlang/
├── native/                   # WASM modules (AssemblyScript)
│   ├── assembly/
│   │   ├── dattorro.ts       # Dattorro plate reverb (310 lines)
│   │   ├── svf.ts            # State variable filter (119 lines)
│   │   ├── comb-filter.ts    # Comb filter for reverb
│   │   ├── allpass-filter.ts # Allpass filter for reverb
│   │   ├── index.ts          # Reverb exports
│   │   └── filter.ts         # Filter exports
│   ├── build/                # Compiled .wasm and .wat files
│   ├── asconfig.json         # AssemblyScript config
│   └── package.json          # Build scripts (asc compiler)
├── public/
│   ├── reverb.wasm           # Deployed reverb module
│   └── filter.wasm           # Deployed filter module
├── src/
│   ├── descriptor/           # Lazy descriptor system
│   │   ├── device.ts         # device() factory with wasmUrl support
│   │   └── types.ts          # DeviceSpec.wasmUrl extension
│   ├── graph/                # DAG → runtime graph
│   │   └── diff/             # Topology hashing for live re-eval
│   ├── runtime/              # AudioWorklet execution + crossfade
│   │   ├── compile.ts        # Fetches & caches WASM modules
│   │   └── processor/
│   │       ├── graph-processor.ts  # WASM instantiation in worklet
│   │       └── runtime-graph.ts    # WASM hydration (hydrateWasmProcess)
│   ├── devices/              # Built-in devices
│   │   ├── osc.ts            # Unified oscillator with shapes
│   │   ├── saw.ts            # Dedicated saw oscillator
│   │   ├── lfo.ts            # LFO with min/max range
│   │   ├── clock.ts          # BPM clock with swing
│   │   ├── seq/              # Sequencer + mini-notation parser
│   │   ├── drums/            # kick, snare, hihat, clap
│   │   ├── reverb.ts         # WASM reverb wrapper + JS fallback
│   │   ├── lpf.ts, hpf.ts, bpf.ts, notch.ts  # WASM filter wrappers
│   │   ├── adsr.ts, env.ts   # Envelopes
│   │   ├── delay.ts          # Delay effect
│   │   ├── math.ts           # mult, sub, clip, scale, etc.
│   │   └── ...               # Other utilities
│   └── ui/                   # Web UI
│       └── test-suite/       # Test pages including live-reeval
├── index.html
├── live-reeval.html          # Live re-eval test page
└── package.json

lang-research/meta/
├── decisions-made.md         # D001-D059
├── worklog.md                # Development history
├── possible-tasks.md         # Task backlog
├── context-letter.md         # This file
├── open-questions.md         # Q001-Q021
└── features/                 # Feature analysis

lang-research/plans/
├── exprs.md                  # Expression-based parser architecture
├── expr-matrix.md            # Feature interaction matrix
└── live-reeval-plan.md       # Live re-eval implementation summary
```

### Key Decisions Reference

See `decisions-made.md` for full list. Critical ones:
- D007: Eurorack metaphor - everything is a signal
- D011: JavaScript as user language
- D012: Descriptors are lazy, only reified at out()
- D021: Process functions serialized via toString()
- D026: Descriptors fully typed with generic parameters
- D028: Seq inputs `trig`/`gateIn`, outputs `cv`/`gate`
- D030: Pattern data serialized via `new Function()` with embedded JSON
- D032: Tie syntax `_` sets tieStart/tie flags; tieStart holds gate high
- D033: Stack syntax `,` creates polyphonic steps with multiple frequencies
- D034: All signals are `PolySignal = number[]`
- D036: Live re-eval uses topology matching (device type + connections, not config)
- D037: Runtime swaps immediately; seq queues pattern changes for next beat
- D038: 100ms linear crossfade between graph swaps
- D039: AudioContext reused across re-evals
- D040: WASM devices via wasmUrl field in DeviceSpec
- D041: Per-node WASM instantiation for independent state
- D042: Mono WASM interface (f32→f32) with poly wrapper
- D043: WASM parameter setters called per-sample for modulation
- D044: AssemblyScript for WASM source (TypeScript-like syntax)
- D045: Fallback-first design - every WASM device has JS fallback
- D046: Dattorro plate reverb for native reverb algorithm
- D048: `?` probability - parser adds prob field, seq rolls dice on step transition
- D052: Probability roll happens on step transition, result stable for step duration
- D053: Only stacks create voices (one per branch, nested stacks flatten)
- D054: Voice IDs assigned to branches, not notes; stable for pattern lifetime
- D055: Nested stacks flatten: `{c4, {a4, b4}, g4}` = 4 voices
- D056: Stack branches fill duration independently (enables polyrhythm)
- D057: Tie controls gate, not voice creation
- D058: Seq output shape: parallel arrays `{ cv[], gate[], trig[] }` by voice ID
- D059: Expression-based parser replaces Beat/Step (enables arbitrary nesting)

### Technical Notes

**Worklet Serialization Gotcha**: Process functions are serialized via `fn.toString()` and sent to the AudioWorklet. Any helper functions called from process() must be defined *inside* process() or they won't exist in the worklet context.

**Tie/Legato**: The `_` operator ties notes together. Gate stays high across all children; pitch changes at transition points. Tie requires matching voice counts on both sides: `{c4,e4}_{g4,a4}` valid, `{c4,e4}_g4` invalid. Use `slew` on the CV for actual pitch glide.

**Polyphony / Voices (D053-D058)**:
- All signals are `PolySignal = number[]`
- Only stacks create voices: `{c4,e4,g4}` = 3 voices, one per branch
- Nested stacks flatten: `{c4, {a4, b4}, g4}` = 4 voices
- Sequential notes share one voice: `c4 e4 g4` = 1 voice, three notes
- Each stack branch independently fills the stack's duration
- Enables polyrhythm: `{c4 d4 e4, f4 g4}` = 3:2 naturally
- Seq outputs parallel arrays: `{ cv: number[], gate: number[], trig: number[] }`
- Voice count fixed at parse time; arrays never resize during playback

**Live Re-eval**: When code is re-evaluated, the runtime swaps graphs immediately. Nodes are matched by topology (device type + connection structure, NOT config values). State is transferred to matched nodes. Seq detects pattern changes via JSON hash and queues them for the next beat. A 100ms linear crossfade between old and new graph outputs masks any audio discontinuities.

**WASM Integration**: Native devices use WebAssembly for performance-critical DSP. The compilation flow:
1. AssemblyScript source in `native/assembly/` → `asc` compiler → `.wasm` binary
2. Compile step fetches WASM URLs in parallel, caches ArrayBuffers
3. Worklet instantiates one WASM module per device node (for independent state)
4. `hydrateWasmProcess()` wraps WASM exports in standard process interface
5. Parameter setters (`set_cutoff()`, `set_room()`) called every sample for modulation
6. Every WASM device has a complete JS fallback for compatibility
