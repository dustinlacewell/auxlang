# Work Log

## 2025-01-05

- Explored Strudel codebase: AGPL-3.0, JS, pattern-based (time → events), ~30 packages
- Explored Punctual codebase: GPL-3.0, PureScript, signal-based (continuous), compiles to AudioWorklet + GLSL
- Confirmed clean-room implementation required for Steam
- Created `strudel-architecture.md`, `punctual-architecture.md`, `licensing-analysis.md`
- Surveyed all Strudel features: mini notation (14 elements, 10 operators), ~80 pattern functions, ~100 audio controls
- Surveyed all Punctual features: ~50 signal types, coordinates, shapes, transforms, color ops
- Created `strudel-features.md`, `punctual-features.md`, `unified-feature-matrix.md`
- Key decision: audio and visual subsystems stay separate, connected via shared bus
- Created `design-considerations.md` with revised architecture
- Created project management docs: `decisions-made.md`, `open-questions.md`, `current-task.md`
- Decision D005: audio needs both discrete (patterns) and continuous (signals) layers
- Created `semantic-model.md` analyzing discrete requirements, continuous requirements, and 4 interaction types
- Explored kabelsalat (AGPL): signal graph compiled to AudioWorklet, trigger-driven sequencing
- Created `kabelsalat-architecture.md`

## 2025-01-06

- Discussed how discrete (patterns) and continuous (signals) interact
- Explored eurorack metaphor: gate/cv separation, clock as signal
- Rejected mixing continuous ops (lpf, lag) into discrete syntax
- Key insight: sequencers are modules that emit signals, everything downstream is continuous
- Pattern ops (fast, rev, euclid) are sequencer controls; modulation happens downstream
- Discussed routing: seq outputs (gate, cv, accent) patch into continuous modules
- Language parses mini-notation to AST; devices interpret AST (enables workshop mods)
- Clock defaults to global tempo but can be overridden with any signal
- Glissando = lag on cv signal, not special discrete syntax
- Created `audio-model-proposal.md` capturing the eurorack-inspired model
- Deep dive into Strudel's method chaining implementation
- Discovered Strudel's model: Pattern = Time → Events with property bags, fixed synth topology
- Identified why Strudel can't do continuous modulation (properties sampled at event creation)
- Explored syntax options: method chaining, DSL, YAML-like, settled on JavaScript
- Key insight: descriptors are lazy - code builds DAG, only reified when connected to output
- Descriptors deduplicated by identity - same source = shared node
- Decided on explicit routing: `osc.pitch(seq.cv)` not magic "main" connections
- Device methods auto-generated from input/output declarations
- Single-output devices can be referenced bare, multi-output need explicit `.outputName`
- Created `syntax-proposal.md` with the new JS-based approach
- Added default input concept: `saw(f.cv)` is sugar for `saw.pitch(f.cv)` (D017)
- `device({...})` is the primitive; built-ins are pre-shipped device calls; users create custom devices same way (D018)
- Device factory itself is a valid descriptor: `lfo` alone works, no parens needed (D019)
- Clarified: timing ops (fast/slow/early) are clock modifiers; pattern ops (rev/euclid/every) are internal to seq (D020)
- Strudel comparison: their fixed patch model = our seq with built-in clock; we factor clock manipulation out explicitly
- No regression from Strudel, plus we gain continuous modulation and arbitrary signal routing

## 2025-01-07

- Started proof-of-concept implementation in `auxlang/`
- Built descriptor system with proxy-based lazy evaluation
- Created `device()` factory with auto-registration and processSource capture
- Implemented graph reification: walks descriptor DAG, produces topologically-sorted nodes
- Built AudioWorklet runtime: receives serialized graph, hydrates process functions via `new Function()`
- Fixed worklet serialization: method shorthand `process(inp) {...}` → `function process(inp) {...}`
- Created built-in devices: saw, lfo, env, lpf, gain, add
- Built web editor with eval loop, Ctrl+Enter to run
- Got audio working: filter sweep with LFO modulation
- Fixed: bare descriptor as signal input (e.g. `lpf(saw(220))`) now uses default output per D016
- Added min/max to LFO for output scaling - recognized LFO and oscillator are same concept
- Discussion: how to support function inputs (e.g. waveshaper) alongside signal inputs
- Explored options: functions as devices, global clock, phasor decomposition
- Settled on D024/D025: function inputs are configuration, not signals; call signature distinguishes them
- Example: `osc(440, { shape: p => Math.sin(p * Math.PI * 2) })` - freq is signal, shape is config
- Implemented config system: DeviceSpec.config, ConfigDef, ConfigValue types
- Process signature now: `process(inputs, config, state, sampleRate)`
- Config functions serialized via toString() in compile step
- Config functions hydrated via new Function() in worklet
- Created unified `osc` device with configurable shape function
- Built-in oscillators: osc (sine), sin, sawOsc, tri, sqr - all share same process logic
- Updated all existing devices to new process signature
- Example working: `osc(220).shape(p => (p * 2 - 1) * 0.7 + Math.sin(p * Math.PI * 2) * 0.3)`
- Updated meta files and context letter for next session
- Next task identified: clock device + sequencer + mini-notation parser for rhythmic music

### Later session: Type System Overhaul

- Added config tests to device.test.ts and reify.test.ts (21 tests total now)
- Found type system debt: `ProcessFn` config parameter caused `cfg.shape` possibly undefined errors
- Fixed `ProcessFn` to be generic: `ProcessFn<I, C, O>` where I=inputs, C=config, O=outputs
- **Major refactor: Fully typed Descriptor system** (D026)
  - `Descriptor<I, C, O>` now generic with input setters, config setters, and output refs as distinct mapped types
  - `device()` infers types from input using `const T extends {...}` pattern
  - `ConfigKeys<T>` helper extracts config keys, returns `never` when no config (no overlap with inputs)
  - `AnyDescriptor` interface as minimal base type all descriptors satisfy
  - `inputs()` now generic: `inputs({ pitch: 440 })` returns `Record<"pitch", InputDef>`
  - Test specs use `as const` for `defaultInput`/`defaultOutput` to get literal types
- Added `@types/node` to fix node_modules type definitions
- Test helpers for `noUncheckedIndexedAccess`: `firstNode()`, `nodeAt()`, `getConfigFn()`
- Result: 21 tests pass, 0 type errors, full IDE autocomplete for `osc.pitch()`, `osc.shape()`, `osc.out`
- TypeScript now catches invalid input/config/output access at compile time

### Clock and Sequencer Session

- **Clock device** (`src/devices/clock.ts`)
  - Inputs: `bpm` (default 120), `swing` (0-0.5)
  - Outputs: `trig` (1-sample pulse), `gate` (50% duty cycle)
  - Tracks phase and beat count in state
  - Swing delays odd beats

- **Mini-notation parser** (`src/devices/seq/`)
  - `types.ts`: Token types, AST nodes, Step/Pattern types
  - `note-to-freq.ts`: A4=440Hz equal temperament conversion
  - `tokenize.ts`: Lexer for notes, rests, brackets
  - `parse.ts`: Recursive descent parser, flattens groups to fractional durations
  - Grammar: `c3`, `c#4`, `db3` (notes), `~` (rest), `[c3 e3]` (subdivision)

- **Sequencer device** (`src/devices/seq/seq.ts`)
  - Inputs: `trig`, `gateIn` (renamed from `gate` to avoid output collision)
  - Outputs: `cv` (frequency Hz), `gate` (1 when note, 0 on rest)
  - Pattern stored via `new Function('return ' + JSON.stringify(pattern))` to survive serialization
  - Edge detection advances step on trig rising edge
  - CV is sample-and-hold, gate follows input but suppressed on rests

- **Serialization fix**: Config closures like `() => pattern` don't serialize correctly
  - `fn.toString()` produces `"() => pattern"` but `pattern` doesn't exist in worklet
  - Solution: `new Function(\`return ${JSON.stringify(pattern)}\`)` embeds data in function body
  - The function's `toString()` then includes the actual JSON data

- Tests: 74 passing (added 53 new tests for seq components)
- Example updated to acid techno patch with bass, lead, and arp voices

### Tie/Legato Syntax Session

- **Implemented `_` tie operator** for legato phrases
  - Tokenizer: Added `GLIDE` token for `_` character
  - Types: Added `tieStart` field to `NoteStep` (was missing, restored)
  - Parser: `applyGlide()` for top-level, `applyGlideToSteps()` for within groups
  - Marks last step of left side with `tieStart: true`
  - Marks first step of right side with `tie: true`
  - Chains work: `c3_g3_e3` → c3 (tieStart), g3 (tie+tieStart), e3 (tie)

- **Fixed gate logic in sequencer**
  - Bug: Both `tie` and `tieStart` were keeping gate high
  - Fix: Only `tieStart` keeps gate high for full duration
  - `tie` flag now only signals "don't re-trigger" for downstream (e.g. envelope)
  - Pattern loop no longer bleeds gate across cycle boundary

- **Added visual test case** for glide in test-suite
  - Example: `seq("c3_g3 ~ e3_c4")` - legato phrases with gap between them
  - Uses `slew` for actual pitch glide effect

- Tests: 102 passing (added 6 glide tests)
- Decision D032: Tie syntax documented

### Polyphony Session

- **Stack syntax `,` for chords** (D033)
  - Parser: `applyStack()` merges freqs from comma-separated notes
  - `c4,e4,g4` → single step with `freqs: [261.63, 329.63, 392.00]`
  - `StackNode` AST type for representing stacked elements

- **All signals now PolySignal** (D034)
  - `PolySignal = number[]` - mono is just 1-channel array
  - Runtime normalizes scalar returns to `[scalar]`
  - Processor sums all channels for mono speaker output
  - Seq extracts channel 0 from poly trig input: `const trig = (inp.trig ?? [0])[0] ?? 0`

- **Seq outputs poly cv for chords**
  - `step.freqs.length === 1` → mono output
  - `step.freqs.length > 1` → poly output (array of frequencies)

- Fixed seq tests: pass `{ trig: [value] }` instead of `{ trig: value }`
- Fixed drums to properly extract mono: `(inp.trig ?? [0])[0]` pattern
- Fixed logic devices (`gte`, `lt`, `eq`, `and`, `or`, `not`) to be polyphonic
- Tests: 107 passing

- **Fixed kick click on retrigger**: Reset phase to 0 on trigger to avoid discontinuity
- **Rewrote clap**: 808-style with proper filter, tighter hit timing (0/8/18/28ms), overlapping tail
- **Added `.poly(n)` and `.detune(cents)` to oscillators** (D035)
  - `poly` is config (set once at device creation)
  - `detune` is modulatable input (can use LFO for movement)
  - `sawOsc(440).poly(4).detune(15)` creates 4 detuned voices
- Added test cases for poly/detune in test-suite

### Live Re-evaluation Session

- **Investigated live re-eval approaches**
  - Studied Strudel (query-based patterns) and Kabelsalat (crossfade between graphs)
  - Rejected global transport/phasor - violates eurorack philosophy of independent clocks
  - Key insight: treat like modular synth - seq is only device with timing opinions

- **Implemented topology-based node matching** (D036)
  - `src/graph/diff/topology-hash.ts`: Computes node identity from device type + connections
  - `src/graph/diff/diff.ts`: Matches old nodes to new nodes by topology hash
  - Config excluded from hash so `clock(120)` matches `clock(180)`
  - 18 tests for topology hashing

- **Implemented device-level transitions** (D037)
  - Runtime swaps graphs immediately - no global beat detection
  - Seq detects pattern changes via JSON hash, queues for next beat (trigger rising edge)
  - Other devices just get state transferred, rely on crossfade

- **Implemented 100ms linear crossfade** (D038)
  - Old graph fades out while new graph fades in
  - Both graphs process simultaneously during fade
  - Masks any remaining audio discontinuities

- **Fixed AudioContext reuse** (D039)
  - `use-audio-player.ts` now reuses existing worklet on re-eval
  - Previously destroyed and recreated AudioContext each time
  - Essential for state preservation to work

- **Created live-reeval test page** (`/live-reeval.html`)
  - Interactive A/B switching tests for various re-eval scenarios
  - Pattern change, BPM change, osc type, filter cutoff, etc.

- Tests: 125 passing
- Updated meta files with decisions D036-D039

### WASM Native Devices Session

- **WASM infrastructure** (D040-D045)
  - Added `wasmUrl` field to `DeviceSpec` for declaring WASM modules
  - Compile step fetches WASM URLs in parallel, caches ArrayBuffers
  - Worklet instantiates one WASM module per device node (for independent state)
  - `hydrateWasmProcess()` wraps WASM exports in standard process interface
  - Parameter setters (`set_cutoff()`, `set_room()`) called per-sample for modulation

- **Dattorro Plate Reverb** (D046)
  - AssemblyScript implementation in `native/assembly/dattorro.ts` (~310 lines)
  - Jon Dattorro's algorithm: pre-delay, 4 input diffusion stages, dual-tank with cross-feedback
  - 12 delay lines with modulated reads, 14 multi-tap outputs
  - Parameters: room (tail length), damp (HF absorption), wet, dry
  - Compiled to ~8KB WASM module
  - Full JS fallback (Freeverb-style) in `src/devices/reverb.ts`

- **State Variable Filter (SVF)** (D047)
  - AssemblyScript implementation in `native/assembly/svf.ts` (~119 lines)
  - Cytomic's SVF design: stable at high resonance, supports audio-rate modulation
  - 4 modes from single core algorithm: lowpass (0), highpass (1), bandpass (2), notch (3)
  - Parameters: cutoff (Hz), resonance (0-1), mode
  - Device wrappers: `lpf.ts`, `hpf.ts`, `bpf.ts`, `notch.ts` (all share `filter.wasm`)
  - Each has complete JS biquad fallback

- **Architecture decisions**:
  - Per-node instantiation: Each device gets own WASM instance for independent state
  - Mono interface (f32→f32): WASM implements simple mono; TypeScript handles polyphony
  - Fallback-first: Every WASM device includes complete JS implementation
  - Setter pattern: Parameters via `set_*()` functions called every sample, not passed to process()

- Test cases added in `src/ui/test-suite/cases/native/`:
  - `native-reverb-simple.ts`: Basic tone through reverb
  - `native-reverb-big-hall.ts`: Sequenced pad with large room
  - `native-reverb-drums.ts`: Drum patterns with reverb
  - `native-reverb-sequenced.ts`: Sequencing integration test

### Expression-Based Sequencer Design Session

- **Designed expression-based parser generalization**
  - Problem: Current parser does eager Beat/Step evaluation, loses information, prevents arbitrary nesting
  - Solution: AST-based approach where any construct can nest inside any other
  - Created `plans/exprs.md` (architecture) and `plans/expr-matrix.md` (feature interactions)

- **Key design decisions made (D053-D059)**:
  - Voice creation: Only stacks create voices (one per branch, nested stacks flatten)
  - Voice IDs: Assigned to branches, not notes; stable for pattern lifetime
  - Stack branch duration: Each branch independently fills allocated duration
  - Tie semantics: Gate holds across children, pitch changes at transitions
  - Output shape: Parallel arrays `{ cv: number[], gate: number[], trig: number[] }`
  - Polyrhythm: `{c4 d4 e4, f4 g4}` = 3:2 naturally (branches subdivide independently)

- **Voice count resolution**:
  - `c4 e4 g4` = 1 voice (sequential notes)
  - `{c4, e4, g4}` = 3 voices (chord)
  - `{c4, {a4, b4}, g4}` = 4 voices (nested stack flattens)
  - `{c4 d4, e4}` = 2 voices (voice 0 subdivides, voice 1 holds)

- **Clarified tie vs re-trigger vs sustain**:
  - `e4 eb4` = re-trigger (gate drops and rises)
  - `e4_eb4` = tie/glide (gate stays high, pitch changes)
  - `e4@2` = sustain (gate stays high, pitch holds)

## 2025-01-09

### Expression-Based Parser Implementation (Phase 1)

- **Implemented full expr-based parser pipeline**
  - `src/devices/seq/expr/types.ts`: Expr AST types, voiceCount(), RuntimePattern, SeqOutput
  - `src/devices/seq/expr/parse.ts`: parseExpr() produces Expr tree
  - `src/devices/seq/expr/evaluate.ts`: evaluate() transforms Expr → RuntimePattern
  - `src/devices/seq/expr/query.ts`: query() for per-sample output
  - `src/devices/seq/seq-expr.ts`: seqExpr() device

- **Test coverage**
  - 38 parser tests, 24 evaluator tests, 13 query tests, 10 device tests
  - 224 total tests passing

- **Interactive test suite**
  - Created 8 test cases under "Expr Parser" category
  - `expr-chord-basic`, `expr-chord-seq`, `expr-polyrhythm-32`, `expr-nested-stack`
  - `expr-voice-leading`, `expr-stack-tie`, `expr-stack-alt`, `expr-stack-prob`

- **API updates**
  - Exported `seqExpr` from `src/editor/api.ts`
  - Input renamed from `trig` to `clk` (D060) to avoid collision with `trig` output

- **Resolved modifier edge cases (D061-D064)**
  - Modifier order: left-to-right (`c4*2@3` = multiply then elongate)
  - Nested Euclidean: parse error
  - Chained maybe: multiply probabilities
  - Group + Elongate: stretch subdivisions

### Signal Format Design Discussion

- **Identified issue with fixed voice count**
  - Current: Voice count fixed at parse time (max across pattern)
  - Problem: Wastes processing on silent voices

- **Proposed solution (D065-D066)**
  - Signals carry voice ID: `{ id: number, value: number }[]`
  - Output only active voices per sample
  - Voice IDs stable for pattern lifetime
  - Downstream devices key state by voice ID, not array index

- **Next steps**: Implement signal format change across system

### Sequencer Architecture Refactor

- **Identified probability bug**: `{c4,e4,g4}?0.5` rolled independently per voice instead of all-or-nothing
- **Root cause**: Flattened event architecture lost hierarchical structure
  - Evaluate phase flattened AST to `VoiceEvent[]`
  - Query phase checked probability per voice in loop
  - No way to group events that share same probability decision

- **Refactored to stateful AST traversal** (D067)
  - Deleted `evaluate.ts` and `query.ts` - no more flattening
  - Created `traverse.ts` - walks AST per-sample maintaining state
  - Probability decisions cached by AST node path + cycle
  - `MaybeExpr` rolls once, skips entire subtree if failed
  - Preserves hierarchical structure throughout

- **Worklet integration**
  - Created `runtime/worklet/seq-traverse.ts` with all traversal logic
  - Attached to `globalThis.seqTraverse` (like existing `poly` utilities)
  - Imported in `worklet/index.ts` as side-effect module
  - `seq.ts` process function uses `globalThis.seqTraverse.traverse()`
  - Pre-calculated `voiceCount` and `totalBeats` at construction time
  - Inlined values via `new Function('return 3')` to survive serialization

- **Applied √n normalization to polysignal mixdown** (D068)
  - `sumToMono()` now divides by `Math.sqrt(sig.length)`
  - Perceptually balanced mixing - common in pro audio
  - Prevents volume increase when adding voices

- Tests: Created `traverse.test.ts` with probability all-or-nothing verification
- Result: `{c4,e4,g4}?0.5` now correctly plays all 3 notes or none

- **Attempted dynamic voice count** (D065) - reverted
  - Initially implemented: output only active voices per-sample
  - Problem: caused clicks when voices disappeared (e.g., `[c4 e4 g4]? ~`)
  - Downstream devices (oscillators, filters) had abrupt discontinuities
  - Reverted: now output all voices with gate=0 for inactive ones
  - Better approach: devices check gate and skip processing when gate=0
  - Maintains continuity, still allows CPU savings via gate checking

### KabelSalat Comparison & Mono Refactor Design

- **Deep dive into KabelSalat architecture**
  - Compared graph compilation approaches: KS codegen vs Auxlang traversal
  - KS generates flat JS code: `r[1] = nodes[0].update(r[0])`
  - Auxlang traverses graph per-sample calling process functions
  - V8 JIT makes codegen marginal benefit; WASM devices dominate CPU anyway

- **Key insight: KabelSalat's polyphony model**
  - KS uses compile-time graph duplication: `sine([220, 330])` creates 2 sine nodes
  - `poly` node triggers multichannel expansion at graph construction
  - All devices are mono - no voice tracking at runtime
  - Tradeoff: no dynamic voice count, but massive simplification

- **Identified why Auxlang's PolySignal is complex**
  - Every device iterates voices, keys state by ID, builds `{id, value}[]`
  - 21 device files redefine `type PS = Array<{ id: number; value: number }>`
  - `LegacyPolySignal` / `fromLegacy` / `toLegacy` conversion layers
  - Hot loop has voice ID lookups every sample

- **Designed AST decomposition approach**
  - `projectVoice(expr, voiceIndex)` extracts single voice timeline
  - `decomposePattern(expr)` returns N mono ASTs for N-voice pattern
  - Graph duplication happens at construction, not runtime
  - Polyrhythm works: `{c4 d4 e4, g3 a3}` becomes independent 3-beat and 2-beat seqs

- **Identified need for explicit poly devices**
  - Without runtime polyphony, need devices to create it explicitly
  - `poly(n)` - duplicate signal path N times
  - `chord([0, 4, 7])` - add intervals to mono pitch
  - `spread(n, detune)` - unison with detuning

- **Planned Uzu syntax refactor** (after mono)
  - Unified input model: merge config and inputs, everything is a signal
  - Method chaining: `osc(440).lpf({ cutoff: 800 }).adsr({ attack: 0.1 })`
  - Device registration for chainable methods
  - Composite devices: functions returning descriptor graphs

- **Created comprehensive plan docs**
  - `plans/polyphony-decomposition.md` - full mono refactor design
  - `plans/uzu-design.md` - architecture vision
  - `plans/core-cleanup.md` - concrete redundancy fixes
  - Updated `meta/context-letter.md` with current focus

### Mono/Uzu Implementation Session

- **Implemented AST projection** (D070)
  - `projectVoice(expr, voiceIndex)` extracts single voice timeline
  - `decomposePattern(expr)` returns N mono ASTs
  - 18 tests passing for various nesting scenarios
  - Files: `src/devices/seq/expr/types.ts`, `project.test.ts`

- **Studied KabelSalat poly handling**
  - Poly infects downstream automatically
  - `.ins` exposes voice array, `.map()` for per-voice ops
  - `.mix()` collapses to mono/stereo
  - `.out()` accepts poly directly

- **Designed Auxlang poly propagation** (D074-D076)
  - Poly descriptor forwards method calls to each voice
  - `.voices` unpacks to array for manual iteration
  - `.out()` accepts poly and sums all voices
  - No magic in reify - infection handles graph duplication at construction

- **Implemented poly.ts with method forwarding**
  - Proxy forwards input/config setters to each voice
  - Output accessors return PolyOutputRef
  - Callable returns new poly with default input set

- **Decided device registration** (D078)
  - `device('name', spec)` auto-registers in global registry
  - Descriptor proxy checks registry for unknown props
  - Enables `seq(...).saw()` to resolve `saw` from registry

- **Key realization** (D077)
  - Mono and Uzu refactors are coupled
  - User-facing poly API depends on chaining syntax
  - Treat as unified refactor

- **Next:** Implement device registry, update device() signature

## 2025-01-10

### Live Re-eval State Preservation (Final Fixes)

- **Fixed TypedArray cloning bug**
  - `JSON.parse(JSON.stringify(state))` destroys Float32Array → becomes plain object `{0: 1, 1: 2...}`
  - Delay/reverb buffers were lost on state restore, causing crackle/artifacts
  - Created `deepCloneState()` and `cloneValue()` in `runtime-graph.ts`
  - Recursively handles Float32Array, Float64Array, Int32Array, Uint8Array
  - Also handles nested objects and arrays containing TypedArrays

- **Fixed false trigger issue on state restore**
  - Root cause: `traversalState.probDecisions` Map doesn't survive JSON cloning
  - When Map corrupted, mono-seq.ts recreated traversalState fresh
  - Fresh state had `lastEventId = ""`, causing false `trig = 1` output
  - Fixed by preserving `lastEventId` and `lastCV` from corrupted state during recreation

- **Clarified trigger model** (D079-D081)
  - Triggers are impulses: exactly one sample at value `1`, then `0`
  - Clock outputs: `0` normally, `1` for trigger, `-bpm` for reset
  - All devices use simple check: `if (trig > 0.5)` - no edge detection
  - Deleted `edge-detect.ts` utility (was unnecessary complexity)

- **Disabled crossfade** (D080)
  - Set `CROSSFADE_MS = 0` in `processor.ts`
  - With proper state preservation, instant swap works cleanly
  - Crossfade was causing both old/new graphs to run during fade, doubling triggers

- **Removed edge detection from all devices**
  - Drums (kick, snare, hihat, clap): simple `if (trig > 0.5)`
  - Utilities (sah, counter, clock-div): simple `if (trig > 0.5)`
  - No `wasTrig`/`wasReset` state tracking needed anywhere

- **Files changed**
  - `src/runtime/processor/runtime-graph.ts` - TypedArray-aware deepCloneState
  - `src/runtime/processor/topology-hash.ts` - Multi-node hash matching (from earlier)
  - `src/runtime/worklet/processor.ts` - CROSSFADE_MS = 0
  - `src/devices/seq/mono-seq.ts` - lastEventId preservation, impulse-based
  - `src/devices/drums/*.ts` - Simple impulse checks
  - `src/devices/clock-div.ts`, `counter.ts`, `sah.ts` - Simple impulse checks

- **Result**: Live re-eval now works seamlessly - state preserved, no false triggers, no crackle
- All 160 tests pass

### WASM State Serialization

- **Problem**: WASM devices (reverb, filter, tape delay) lost internal state during graph swap
  - WASM state lives in linear memory, not JS `state` object
  - Fresh WASM instances = reset delay buffers = audible artifacts ("foom" on reverb)

- **Solution**: Standard WASM state serialization interface (D082)
  - `get_state_size()` - Returns f32 count needed
  - `alloc_state_buffer(size)` - Allocates buffer in WASM memory, returns pointer
  - `serialize_state()` - Writes state to buffer
  - `deserialize_state()` - Reads state from buffer

- **Implementation**:
  - Filter (SVF): 2 floats (ic1eq, ic2eq)
  - Reverb (Dattorro): ~82K floats (12 delay lines + pre-delay + scalars)
  - Tape delay: ~97K floats (delay buffer + modulation state)

- **Graph swap flow**:
  1. Serialize state from old WASM instances
  2. Create fresh WASM instances
  3. Call `init()` on new instances
  4. Deserialize saved state into new instances
  5. Crossfade works properly (100ms) since old/new have separate instances

- **Files changed**:
  - `native/assembly/svf.ts` - State getters/setters
  - `native/assembly/filter.ts` - Serialization exports
  - `native/assembly/dattorro.ts` - serializeState/deserializeState methods
  - `native/assembly/index.ts` - Reverb serialization exports
  - `native/assembly/tape-delay.ts` - serializeState/deserializeState methods
  - `native/assembly/tape.ts` - Tape serialization exports
  - `src/runtime/worklet/processor.ts` - serializeWasmState/deserializeWasmState helpers
  - `src/runtime/processor/runtime-graph.ts` - Removed WeakMap init tracking

- **Result**: Reverb/filter/delay tails preserved perfectly across re-eval

### API Cleanup and Documentation

- **Removed `vca` device** (D083)
  - Redundant with `gain` - both just multiply input by a modulation signal
  - `gain({ level: envelope })` is clearer than `vca({ cv: envelope })`
  - Deleted from `src/devices/gain.ts` and `src/editor/api.ts`

- **Renamed `gain.amount` to `gain.level`**
  - `amount` was confusing - sounded like "how much gain"
  - `level` clearly indicates amplitude control (0-1 from envelope, or any multiplier)
  - Updated 43 test files, editor default code, and internal `out.ts` mixing

- **Rewrote `.claude/rules/auxlang-guide.md`**
  - Complete rewrite with proper structure:
    1. Core concepts (signals, descriptors, devices)
    2. Pattern syntax (mini-notation DSL)
    3. JavaScript API (instantiation, variable semantics, output access, chaining)
    4. Polyphony (pattern-level, JS-level with `poly()`, voice access via `.voices`)
    5. Device categories with key inputs noted
    6. Common patterns (copy-paste examples)
    7. Key gotchas (variable capture issue, seq needs clock, etc.)
