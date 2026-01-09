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
