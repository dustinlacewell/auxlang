# Open Questions

## Syntax & Language Design
| ID | Question | Status |
|----|----------|--------|
| Q001 | What syntax style for audio sequencing? (mini notation vs function-based vs hybrid) | Open |
| Q002 | What syntax style for visuals? (Punctual-terse vs explicit vs fluent) | Open |
| Q003 | Single language or two separate DSLs? | Resolved → D011 (JavaScript) |
| Q004 | How to handle audio-visual bridge? (FFT data, triggers, shared memory vs messages) | Open |

## Technical Architecture
| ID | Question | Status |
|----|----------|--------|
| Q005 | Implementation language? (TypeScript vs Rust+WASM vs hybrid) | Resolved → TypeScript for PoC |
| Q006 | Parser technology? (Peggy vs Nearley vs Tree-sitter vs hand-written) | N/A for audio (JS); still open for mini-notation |
| Q007 | Timing/scheduling model? (cycles vs beats vs seconds, AudioWorklet threading) | Partially resolved → AudioWorklet, sample-accurate |
| Q008 | Desktop wrapper? (Tauri vs Electron) | Open |

## User Experience
| ID | Question | Status |
|----|----------|--------|
| Q009 | What's the minimum viable feature set? | Open |
| Q010 | Editor integration approach? (CodeMirror vs Monaco vs external) | Open |
| Q011 | Error handling and live feedback model? | Open |

## Business/Legal
| ID | Question | Status |
|----|----------|--------|
| Q012 | What license for uzulang itself? (proprietary vs MIT vs source-available) | Open |
| Q013 | Sample/asset sourcing and licensing? | Open |

## Compositional Features
| ID | Question | Status |
|----|----------|--------|
| Q014 | How should `mask` work? Device-level gate or seq method? | Open |
| Q015 | How should `struct` work? Struct pattern provides rhythm, main provides pitch - seq method or pattern combinator? | Open |
| Q016 | How should `stack` work? JS-level composition of seq outputs or something more integrated? | Resolved → D053-D058 (stack in notation creates voices) |

## Expression-Based Parser
| ID | Question | Status |
|----|----------|--------|
| Q017 | Modifier order: `c4*2@3` — which applies first? | Resolved → D061 (left-to-right) |
| Q018 | Nested Euclidean: `c4(3,8)(2,5)` — meaningful or error? | Resolved → D062 (parse error) |
| Q019 | Chained Maybe: `c4?0.3?0.5` — multiply probabilities or error? | Resolved → D063 (multiply) |
| Q020 | Group + Elongate: `[c4 e4]@2` — stretch subdivisions or repeat group? | Resolved → D064 (stretch) |
| Q021 | Backward compatibility: How to support existing patterns expecting `cv: number` (mono)? | Open |
| Q022 | Stack probability: `{c4,e4,g4}?0.5` — roll per voice or all-or-nothing? | Resolved → D067 (all-or-nothing via AST traversal) |

## Mono/Uzu Refactor

| ID | Question | Status |
|----|----------|--------|
| Q023 | How does `.saw()` work on a poly descriptor? | Resolved → D074: poly propagates, method forwards to each voice |
| Q024 | Do we need magic graph expansion in reify? | Resolved → No, poly infection handles it at construction time |
| Q025 | Do multiple `out()` calls sum automatically? | Open — need to verify runtime behavior |
| Q026 | How do devices register for Uzu chaining? | Resolved → `device('name', spec)` auto-registers |
| Q027 | With Uzu, do we still need separate config vs inputs? | Open — leaning toward keeping config for non-signal data |
| Q028 | How does stereo/pan work with mono signals? | Open — pan outputs stereo pair? metadata? out() param? |

## Live Re-eval & Triggers

| ID | Question | Status |
|----|----------|--------|
| Q029 | Should triggers be impulses or gates? | Resolved → D079: impulses (1 sample), check `trig > 0.5` |
| Q030 | Do we need edge detection for trigger handling? | Resolved → D079: No, impulses eliminate need for edge detection |
| Q031 | How does state survive graph swap? | Resolved → topology hash matching + TypedArray-aware deep clone + WASM serialization |
| Q032 | How to handle effect tails during re-eval? | Resolved → D080/D082: crossfade (3s) + WASM state serialization |
| Q033 | How do WASM devices preserve state across re-eval? | Resolved → D082: serialize/deserialize interface, state copied between instances |
| Q039 | How does seq cursor state survive graph swap? | Resolved → cursor is plain object, deepCloneState handles nested objects correctly |

## API Design

| ID | Question | Status |
|----|----------|--------|
| Q034 | Should we have both `vca` and `gain`? | Resolved → D083: No, removed `vca`. Use `gain({ level: envelope })` |
| Q035 | What should the gain modulation input be called? | Resolved → D083: `level` (not `amount` or `cv`) |

## core2 Architecture

| ID | Question | Status |
|----|----------|--------|
| Q036 | Should devices be self-contained or can they rely on worklet globals? | Resolved → seq uses `globalThis.seqCursor` for cursor API. Acceptable for now. |
| Q037 | How to handle v1 to core2 migration? | Open — both exist currently. Need deprecation plan. |
| Q038 | Should expand hooks receive spec defaults or just user-provided config? | Resolved — user-provided only. Devices access constants from module scope (e.g., `CHORD_SEMITONES`). |
