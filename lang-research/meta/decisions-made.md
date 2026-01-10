# Decisions Made

| ID | Decision | Date | Rationale |
|----|----------|------|-----------|
| D001 | Target platform is Steam (desktop) | 2025-01-05 | User requirement for commercial distribution |
| D002 | Clean-room implementation required | 2025-01-05 | Strudel (AGPL) and Punctual (GPL) incompatible with proprietary release |
| D003 | Audio and visual subsystems are separate but interacting | 2025-01-05 | Different paradigms (discrete events vs continuous signals) optimize better separately |
| D004 | Use Web Audio API and WebGL as rendering targets | 2025-01-05 | Browser standards, cross-platform, works in Tauri/Electron |
| D005 | Audio has both discrete (patterns) and continuous (signals) layers | 2025-01-05 | Enables smooth ramps, crescendos, LFO modulation - fixes Strudel's step-only limitation |
| D006 | Studied kabelsalat as continuous audio reference (AGPL, cannot use) | 2025-01-05 | Demonstrates signal graph compilation to AudioWorklet, trigger-based sequencing bridges discrete/continuous |
| D007 | Audio uses eurorack metaphor - everything is a signal | 2025-01-06 | Sequencers are modules outputting gate/cv, continuous ops are downstream, clock is a signal |
| D008 | Sequencers receive parsed AST, not raw strings | 2025-01-06 | Language parses mini-notation once, devices interpret AST - enables workshop custom devices |
| D009 | Clock defaults to global tempo but is overridable per-sequencer | 2025-01-06 | Any signal can be a clock source (impulse, LFO, another seq's gate) |
| D010 | Signals are polymorphic (carry channel count, ops broadcast) | 2025-01-06 | Polyphony emerges naturally - chords become multi-channel signals, all downstream ops auto-expand |
| D011 | Use JavaScript as the user-facing language (not a custom DSL) | 2025-01-06 | Users get real programming (loops, functions, conditionals), editor tooling for free, smooth path from beginner to device author |
| D012 | Device descriptors are lazy - only reified when connected to output | 2025-01-06 | Code builds a DAG of descriptors; only reachable nodes become real audio graph nodes; enables dead code elimination |
| D013 | Descriptors are deduplicated by identity | 2025-01-06 | Same descriptor referenced twice becomes one shared node in the audio graph; natural signal sharing |
| D014 | Devices declare named inputs/outputs; methods auto-generated from declarations | 2025-01-06 | `.pitch(x)` sets input, `.cv` accesses output; no magic, just objects with getters |
| D015 | Input methods return new descriptor with new identity | 2025-01-06 | `lfo.rate(4)` returns a new descriptor; `slowLfo` and `slowLfo.rate(8)` are different nodes when reified |
| D016 | Devices can declare a default output | 2025-01-06 | Single-output devices (osc, lpf, env) can be referenced bare; `voice * 0.5` means `voice.out * 0.5` |
| D017 | Devices can declare a default input; calling device as function sets it | 2025-01-06 | `saw(f.cv)` is sugar for `saw.pitch(f.cv)`; enables terse chaining like `lpf(oscs).cutoff(800)` |
| D018 | `device({...})` is the primitive; built-ins are pre-shipped device calls | 2025-01-06 | Users define custom devices with same API as built-ins; descriptor carries reference to device definition including `process` |
| D019 | Device factory itself is a valid descriptor with defaults | 2025-01-06 | `lfo` alone (no parens) is a working descriptor with default inputs; `lfo()` and `lfo` are equivalent |
| D020 | Timing ops (fast/slow/early) are clock modifiers, not seq methods | 2025-01-06 | Seq just steps on clock edges; timing manipulation happens via clock signal; pattern ops (rev/euclid/every) stay internal to seq |
| D021 | Process functions are serialized via toString() for worklet transfer | 2025-01-07 | AudioWorklet runs in separate thread; can't transfer functions directly; stringify on compile, hydrate via new Function() in worklet |
| D022 | Descriptor registry tracks all created descriptors by ID | 2025-01-07 | Needed for graph reification - OutputRef contains ID, registry provides the actual descriptor |
| D023 | LFO and oscillators share min/max for output scaling | 2025-01-07 | No fundamental difference between LFO and audio-rate oscillator; both output scaled signals |
| D024 | Function inputs are distinct from signal inputs | 2025-01-07 | Signals are numbers/connections modulated at audio rate; functions are configuration (e.g. waveshaper) called internally by device |
| D025 | Device call signature: dev(signal) or dev(signal, config) or dev(config) | 2025-01-07 | First arg sets default signal input; second arg (or first if object) is config containing function inputs |
| D026 | Descriptors are fully typed with generic parameters | 2025-01-07 | `Descriptor<I, C, O>` where I=input keys, C=config keys, O=output keys; enables IDE autocomplete, compile-time validation of `.pitch()`, `.shape()`, `.out` access |
| D027 | Clock outputs both trig (1-sample pulse) and gate (50% duty cycle) | 2025-01-07 | Enables both trigger-based (advance seq) and gate-based (envelope duration) use cases |
| D028 | Sequencer inputs are `trig` and `gateIn`, outputs are `cv` and `gate` | 2025-01-07 | Avoids name collision between input `gate` and output `gate`; explicit wiring with `.trig(c.trig).gateIn(c.gate)` |
| D029 | Mini-notation v1: notes, rests, groups | 2025-01-07 | `c3 e3 ~ [g3 b3]` - notes with optional accidental/octave, `~` for rest, `[]` for subdivisions |
| D030 | Pattern data serialized via `new Function()` with embedded JSON | 2025-01-07 | Config closures like `() => pattern` don't survive `toString()`; instead create function with inlined JSON: `new Function('return [...]')` |
| D031 | Groups flatten to steps with fractional durations | 2025-01-07 | `[c4 e4]` becomes two steps each with `dur: 0.5`; simpler runtime than tracking sub-steps |
| D032 | Tie syntax `_` for legato | 2025-01-07 | `c3_g3` ties notes: `tieStart` holds gate high for full duration, `tie` signals continuation. Use with `slew` for pitch glide. |
| D033 | Stack syntax `,` for polyphony | 2025-01-07 | `c4,e4,g4` creates polyphonic step with `freqs: [c4Hz, e4Hz, g4Hz]` |
| D034 | All signals are PolySignal (number[]) | 2025-01-07 | Mono = 1-channel array; runtime normalizes scalars to `[scalar]`; processor sums channels for mono output |
| D035 | Oscillators have `.poly(n)` config and `.detune(cents)` input | 2025-01-07 | `poly` is config (voice count, set once); `detune` is modulatable input for unison spread |
| D036 | Live re-eval uses topology matching for state preservation | 2025-01-07 | Nodes identified by device type + connection structure (not config); enables state transfer when params change |
| D037 | Runtime swaps graphs immediately; devices handle own transitions | 2025-01-07 | No global beat detection; seq queues pattern changes for next beat; other devices rely on crossfade |
| D038 | 100ms linear crossfade between graph swaps | 2025-01-07 | Masks audio discontinuities; long enough to sound smooth, short enough to be responsive |
| D039 | AudioContext reused across re-evals | 2025-01-07 | UI sends new graph to same worklet instance instead of destroying/recreating |
| D040 | WASM devices via wasmUrl field in DeviceSpec | 2025-01-08 | Device declares URL to WASM module; compile step fetches and caches; worklet instantiates |
| D041 | Per-node WASM instantiation for independent state | 2025-01-08 | Each device instance gets its own WASM module instance; enables independent filter/reverb state |
| D042 | Mono WASM interface (f32→f32) with poly wrapper | 2025-01-08 | WASM implements simple mono processing; TypeScript wrapper handles polyphony (sum inputs, broadcast output) |
| D043 | WASM parameter setters called per-sample | 2025-01-08 | Instead of passing params to process(), WASM uses `set_cutoff()`, `set_room()` etc. called every sample for audio-rate modulation |
| D044 | AssemblyScript for WASM source | 2025-01-08 | TypeScript-like syntax compiles to WASM; enables sharing types/patterns between JS and native code |
| D045 | Fallback-first design for WASM devices | 2025-01-08 | Every WASM device includes complete JS implementation; WASM is performance enhancement, not requirement |
| D046 | Dattorro plate reverb for native reverb | 2025-01-08 | Jon Dattorro's algorithm: allpass diffusion, dual-tank with cross-feedback, modulated delays; high quality at ~8KB |
| D047 | Cytomic SVF for native filters | 2025-01-08 | State variable filter: stable at high resonance, 4 modes (lpf/hpf/bpf/notch) from single core algorithm |
| D048 | `?` probability in mini-notation | 2025-01-08 | Parser adds `prob` field to step; seq rolls dice at runtime; `c3?` = 50% chance |
| D049 | `pick(a, b, prob)` device for per-cycle parameter variation | 2025-01-08 | Probabilistic sample-and-hold; re-rolls on trigger, holds until next; eurorack-native approach to Strudel's `rarely`/`sometimes` |
| D050 | Strudel's `rarely(fn)` maps to signal routing, not pattern transformation | 2025-01-08 | In Strudel, `rarely` modifies the synth/orbit for that cycle. Our equivalent: use `pick` to modulate device parameters per-cycle. E.g., `reverb(x).room(pick(0.3, 0.8, 0.25).trig(c.trig))` |
| D051 | Compositional features use eurorack philosophy | 2025-01-08 | Pattern-on-pattern features (mask, struct, stack) should compose from signal primitives where possible, not magic methods |
| D052 | `?` probability implemented with step-transition roll | 2025-01-08 | Seq tracks `lastStepIdx` and `probPass`; rolls dice on step transition; result stable for duration of step |
| D053 | Only stacks create voices | 2025-01-08 | Each stack branch = 1 voice (unless branch is stack, which flattens). Sequential notes share one voice. |
| D054 | Voice IDs assigned to branches, not notes | 2025-01-08 | Walk AST depth-first, increment counter at leaf branches. IDs stable for pattern lifetime. |
| D055 | Nested stacks flatten | 2025-01-08 | `{c4, {a4, b4}, g4}` = 4 voices. Voice count = sum of branch voice counts, recursively. |
| D056 | Stack branches fill duration independently | 2025-01-08 | Each branch fills stack's allocated duration. Single notes hold; sequences subdivide. Enables 3:2 polyrhythm. |
| D057 | Tie controls gate, not voice creation | 2025-01-08 | Gate stays high across children, pitch changes at transitions. Tie requires matching voice counts on both sides. |
| D058 | Seq output shape: parallel arrays by voice | 2025-01-08 | `{ cv: number[], gate: number[], trig: number[] }` indexed by voice ID. Fixed length for pattern lifetime. |
| D059 | Expression-based parser replaces Beat/Step | 2025-01-08 | AST with Expr tree enables arbitrary nesting. Modifiers compose uniformly. Evaluated to RuntimePattern at query. |
| D060 | seqExpr input renamed from `trig` to `clk` | 2025-01-09 | Avoids collision: `.clk()` sets clock input, `.trig` accesses onset output |
| D061 | Modifier order is left-to-right | 2025-01-09 | `c4*2@3` = multiply first, then elongate |
| D062 | Nested Euclidean is parse error | 2025-01-09 | `c4(3,8)(2,5)` rejected at parse time |
| D063 | Chained maybe multiplies probabilities | 2025-01-09 | `c4?0.3?0.5` = 0.15 chance |
| D064 | Group + Elongate stretches subdivisions | 2025-01-09 | `[c4 e4]@2` = each note gets 1 beat instead of 0.5 |
| D065 | Voice count should be dynamic per-sample | 2025-01-09 | Output only active voices; don't waste processing on silent channels |
| D066 | Signals carry voice ID with value | 2025-01-09 | Format: `{ id: number, value: number }[]` — enables state keying by voice ID |
| D067 | Sequencer uses stateful AST traversal instead of flattened events | 2025-01-09 | Preserves hierarchical structure; enables correct probability semantics (all-or-nothing for stacks); probability decisions cached by AST node path |
| D068 | Polysignal mixdown uses √n normalization | 2025-01-09 | `sum / Math.sqrt(n)` for perceptually balanced mixing; prevents volume increase when adding voices; common in pro audio |
| D069 | Move to compile-time graph duplication for polyphony | 2025-01-09 | Replace runtime PolySignal with KabelSalat-style approach: decompose poly patterns to mono ASTs, duplicate downstream graph. Eliminates voice ID tracking, simplifies all devices to mono. |
| D070 | AST decomposition via projectVoice() | 2025-01-09 | Extract single voice timeline from polyphonic pattern. `{c4, e4}` decomposes to voice 0: `c4`, voice 1: `e4`. Enables mono signals throughout. |
| D071 | Polyrhythm via independent seq cycles | 2025-01-09 | `{c4 d4 e4, g3 a3}` becomes two seqs with different loop lengths (3 beats, 2 beats). They phase naturally - correct polyrhythm behavior. |
| D072 | Explicit poly devices for non-pattern polyphony | 2025-01-09 | `poly(n)`, `chord([intervals])`, `spread(n, detune)` trigger graph duplication. Polyphony is always visible in code. |
| D073 | Stereo only at mix/output | 2025-01-09 | Everything mono until final mix. Mix device has spread parameter for stereo positioning. Matches eurorack model. |
