# Sequencer Implementation Plan

## Overview

Add a sequencer device that parses mini-notation patterns and outputs CV/gate signals synchronized to a clock.

**Target usage:**
```javascript
let c = clock(120)
let s = seq("c3 e3 g3").trig(c.trig).gate(c.gate)
let voice = osc(s.cv)
let shaped = gain(voice).amount(env(s.gate).out)
return out(shaped)
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Parsing location | Descriptor creation (main thread) | Errors surface immediately, pattern data serializes via config |
| Pattern storage | Config function returning array | `() => [...]` serializes/hydrates correctly |
| v1 notation | Notes, rests, groups | `c3 e3 ~ [g3 b3]` - musical from the start |
| Clock wiring | Explicit `.trig()` and `.gate()` | Follows existing patterns, simpler implementation |
| Note output | Frequency in Hz | Matches `osc(freq)` convention |
| Group handling | Pre-flatten with fractional durations | Simpler runtime logic |
| File location | `src/devices/seq/` | Groups with other devices |

## File Structure

```
src/devices/seq/
├── types.ts           # Token, AST, Step, Pattern types
├── note-to-freq.ts    # Note name -> Hz conversion
├── tokenize.ts        # String -> Token[]
├── parse.ts           # Token[] -> Pattern (flattened)
├── seq.ts             # Main seq() device
├── note-to-freq.test.ts
├── tokenize.test.ts
├── parse.test.ts
└── seq.test.ts
```

## Mini-Notation Grammar (v1)

```
Pattern     := Step (SPACE Step)*
Step        := Note | Rest | Group
Note        := NoteName Accidental? Octave?
NoteName    := [a-gA-G]
Accidental  := '#' | 'b'
Octave      := [0-9]
Rest        := '~'
Group       := '[' Pattern ']'
```

**Examples:**
- `"c3 e3 g3"` - Three notes
- `"c3 ~ e3"` - Note, rest, note
- `"c3 [e3 g3] c4"` - Note, subdivided pair, note (flattens to 4 steps with fractional durations)

## Types (`types.ts`)

```typescript
// Tokens
type TokenType = 'NOTE' | 'REST' | 'LBRACKET' | 'RBRACKET' | 'EOF';
interface Token { type: TokenType; value: string; position: number; }

// AST (after parsing, before flattening)
interface NoteNode { type: 'note'; name: string; accidental: '#' | 'b' | null; octave: number; }
interface RestNode { type: 'rest'; }
interface GroupNode { type: 'group'; children: AstNode[]; }
type AstNode = NoteNode | RestNode | GroupNode;

// Flattened pattern (what the device uses)
interface NoteStep { type: 'note'; freq: number; dur: number; }
interface RestStep { type: 'rest'; dur: number; }
type Step = NoteStep | RestStep;
type Pattern = Step[];
```

## Note-to-Frequency (`note-to-freq.ts`)

```typescript
// A4 = 440Hz, equal temperament
// MIDI: C4 = 60, A4 = 69
const NOTE_OFFSETS: Record<string, number> = {
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11
};

export function noteToFreq(name: string, accidental: '#' | 'b' | null, octave: number): number {
  let semitone = NOTE_OFFSETS[name.toLowerCase()];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  const midi = semitone + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
```

## Tokenizer (`tokenize.ts`)

Simple hand-written lexer:
1. Skip whitespace (but track it for separation)
2. Match `[` → LBRACKET
3. Match `]` → RBRACKET
4. Match `~` → REST
5. Match note pattern `/[a-gA-G][#b]?[0-9]?/` → NOTE
6. Return token array

## Parser (`parse.ts`)

Recursive descent parser:
1. Parse sequence of steps until EOF or `]`
2. For each token:
   - NOTE → parse note, convert to freq, add NoteStep
   - REST → add RestStep
   - LBRACKET → recursively parse group, flatten with fractional durations
3. Return flat Pattern array

**Flattening groups:**
```typescript
// Input: "c4 [e4 g4] c5"
// Parsed groups: [NoteNode(c4), GroupNode([NoteNode(e4), NoteNode(g4)]), NoteNode(c5)]
// Flattened: [
//   { type: 'note', freq: 261.63, dur: 1 },
//   { type: 'note', freq: 329.63, dur: 0.5 },  // half duration
//   { type: 'note', freq: 392.00, dur: 0.5 },  // half duration
//   { type: 'note', freq: 523.25, dur: 1 },
// ]
```

## Sequencer Device (`seq.ts`)

```typescript
import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { parse } from "./parse";
import type { Pattern, Step } from "./types";

export function seq(patternString: string) {
  const pattern = parse(patternString);

  return device({
    inputs: inputs({ trig: 0, gate: 0 }),
    config: { pattern: () => pattern },
    outputs: ["cv", "gate"],
    defaultInput: "trig",
    defaultOutput: "cv",
    process(inp, cfg, state, _sampleRate) {
      // Get pattern (cached in state after first call)
      const pat = (state.pat as Pattern) ?? cfg.pattern();
      state.pat = pat;

      // Edge detection
      const wasTrig = (state.wasTrig as number) ?? 0;
      const trigOn = (inp.trig ?? 0) > 0.5;
      const trigWasOn = wasTrig > 0.5;
      const risingEdge = trigOn && !trigWasOn;

      // Current step tracking
      let stepIndex = (state.stepIndex as number) ?? 0;
      let cv = (state.cv as number) ?? (pat[0]?.type === 'note' ? pat[0].freq : 0);

      // Advance on rising edge
      if (risingEdge && pat.length > 0) {
        stepIndex = (stepIndex + 1) % pat.length;
        const step = pat[stepIndex];
        if (step.type === 'note') {
          cv = step.freq;
        }
        // Rest: cv holds previous value (sample-and-hold)
      }

      // Gate output: follow input gate, but suppress on rests
      const step = pat[stepIndex] ?? { type: 'rest' };
      const gateOut = step.type === 'note' && (inp.gate ?? 0) > 0.5 ? 1 : 0;

      // Update state
      state.wasTrig = inp.trig ?? 0;
      state.stepIndex = stepIndex;
      state.cv = cv;

      return { cv, gate: gateOut };
    },
  });
}
```

## Data Flow

```
User code:        seq("c3 e3 g3")
                       │
Parse (main):     tokenize → parse → flatten
                       │
Pattern:          [{ type:'note', freq:130.81, dur:1 }, ...]
                       │
Config:           { pattern: () => [...] }
                       │
Compile:          pattern.toString() → "() => [{type:'note',...},...]"
                       │
Worklet hydrate:  new Function("return " + source)()
                       │
Process:          cfg.pattern() → cached in state.pat
                       │
Each sample:      advance on trig edge, output cv/gate
```

## Implementation Phases

### Phase 1: Note utilities
- [ ] Create `src/devices/seq/types.ts`
- [ ] Create `src/devices/seq/note-to-freq.ts`
- [ ] Create `src/devices/seq/note-to-freq.test.ts`
- [ ] Verify: A4=440Hz, C4=261.63Hz, sharps/flats work

### Phase 2: Tokenizer
- [ ] Create `src/devices/seq/tokenize.ts`
- [ ] Create `src/devices/seq/tokenize.test.ts`
- [ ] Verify: notes, rests, brackets tokenize correctly

### Phase 3: Parser
- [ ] Create `src/devices/seq/parse.ts`
- [ ] Create `src/devices/seq/parse.test.ts`
- [ ] Verify: sequences parse, groups flatten with correct durations

### Phase 4: Sequencer device
- [ ] Create `src/devices/seq/seq.ts`
- [ ] Create `src/devices/seq/seq.test.ts`
- [ ] Add export to `src/editor/api.ts`
- [ ] Verify: descriptor creates, outputs cv/gate

### Phase 5: Integration
- [ ] Test with clock device in browser
- [ ] Update example code in index.html
- [ ] Update possible-tasks.md (mark complete)

## Test Cases

**note-to-freq.test.ts:**
- A4 → 440Hz
- C4 → 261.63Hz
- C#4 → 277.18Hz
- Db4 → 277.18Hz (same as C#4)

**tokenize.test.ts:**
- `"c4"` → [NOTE("c4"), EOF]
- `"c4 e4"` → [NOTE("c4"), NOTE("e4"), EOF]
- `"~"` → [REST, EOF]
- `"[c4 e4]"` → [LBRACKET, NOTE("c4"), NOTE("e4"), RBRACKET, EOF]

**parse.test.ts:**
- `"c4"` → 1 note step
- `"c4 e4 g4"` → 3 note steps
- `"c4 ~ e4"` → note, rest, note
- `"[c4 e4]"` → 2 notes with dur=0.5 each
- `"c4 [e4 g4] c5"` → 4 steps (1, 0.5, 0.5, 1 durations)
- Invalid input throws

**seq.test.ts:**
- Creates valid descriptor
- Has cv and gate outputs
- Pattern stored in config
- Process function advances on trigger

## Files Modified

- `src/editor/api.ts` - add `export { seq } from "../devices/seq/seq"`

## Files Created

- `src/devices/seq/types.ts`
- `src/devices/seq/note-to-freq.ts`
- `src/devices/seq/note-to-freq.test.ts`
- `src/devices/seq/tokenize.ts`
- `src/devices/seq/tokenize.test.ts`
- `src/devices/seq/parse.ts`
- `src/devices/seq/parse.test.ts`
- `src/devices/seq/seq.ts`
- `src/devices/seq/seq.test.ts`
