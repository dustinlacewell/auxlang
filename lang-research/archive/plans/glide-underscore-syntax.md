# Glide/Legato Syntax: Underscore `_`

## Purpose

Add underscore syntax for legato/glide phrases where gate stays high and pitch slides smoothly between notes.

## Syntax

```
c3_g3_e3_c4    → 4 beats, continuous gate, pitch glides between notes
```

## Semantics

The underscore `_` is a **binary operator** that ties adjacent elements at their boundary:

1. Mark the **last step** of the left side with `tieStart: true`
2. Mark the **first step** of the right side with `tie: true`
3. Both sides keep their normal structure/timing

### Examples

**Simple chain:**
```
c3_g3_e3_c4
```
- c3: `tieStart: true`
- g3: `tie: true, tieStart: true`
- e3: `tie: true, tieStart: true`
- c4: `tie: true`

**With groups - 2 glides:**
```
c3_[e3 g3]
```
- Beat 0: c3 (`tieStart: true`)
- Beat 1: [e3 g3] subdivided
  - e3: `tie: true, tieStart: true` (receives tie from c3)
  - g3: `tie: true` (receives tie from e3 within group)
- Result: gate high throughout, pitch glides c3→e3→g3

**With alternation - 1 glide per cycle:**
```
c3_<e3 g3>
```
- Cycle 0: c3 ties to e3
- Cycle 1: c3 ties to g3

## Implementation

### 1. Tokenizer (`tokenize.ts`)

Add `GLIDE` token type for `_`:

```typescript
// In TokenType union
| "GLIDE"     // _

// In tokenize function
case "_":
  tokens.push({ type: "GLIDE", value: "_", position: i });
  i++;
  break;
```

### 2. Types (`types.ts`)

Already has `tieStart` and `tie` on steps - no changes needed.

### 3. AST (`types.ts`)

Add GlideNode:

```typescript
export interface GlideNode {
  readonly type: "glide";
  readonly left: AstNode;
  readonly right: AstNode;
}

// Add to AstNode union
| GlideNode
```

### 4. Parser (`parse.ts`)

Parse `_` as a binary operator in sequence parsing. When flattening:

```typescript
// In flattenNode or similar
case "glide": {
  const leftBeats = flatten(node.left);
  const rightBeats = flatten(node.right);

  // Mark last step of left with tieStart
  const lastLeftBeat = leftBeats[leftBeats.length - 1];
  const lastLeftStep = lastLeftBeat[lastLeftBeat.length - 1];
  if (lastLeftStep.type === "note") {
    lastLeftStep.tieStart = true;
  }

  // Mark first step of right with tie
  const firstRightBeat = rightBeats[0];
  const firstRightStep = firstRightBeat[0];
  if (firstRightStep.type === "note") {
    firstRightStep.tie = true;
  }

  return [...leftBeats, ...rightBeats];
}
```

### 5. Sequencer (`seq.ts`)

Already handles `tie` and `tieStart` for gate logic - no changes needed.

## Precedence

`_` should bind tighter than space (sequence) but looser than postfix operators (`*`, `!`, `@`, `(k,n)`):

```
c3*2_e3     → (c3*2)_e3, not c3*(2_e3)
c3_e3 g3   → (c3_e3) g3, not c3_(e3 g3)
```

## Test Cases

```typescript
// Simple glide
parse("c3_g3") → [
  [{ type: "note", freq: 130.81, dur: 1, tieStart: true }],
  [{ type: "note", freq: 196.00, dur: 1, tie: true }]
]

// Chain
parse("c3_g3_e3") → [
  [{ type: "note", freq: 130.81, dur: 1, tieStart: true }],
  [{ type: "note", freq: 196.00, dur: 1, tie: true, tieStart: true }],
  [{ type: "note", freq: 164.81, dur: 1, tie: true }]
]

// With group
parse("c3_[e3 g3]") → [
  [{ type: "note", freq: 130.81, dur: 1, tieStart: true }],
  [
    { type: "note", freq: 164.81, dur: 0.5, tie: true, tieStart: true },
    { type: "note", freq: 196.00, dur: 0.5, tie: true }
  ]
]
```

## Files to Modify

1. `src/devices/seq/types.ts` - Add GlideNode to AST types
2. `src/devices/seq/tokenize.ts` - Add GLIDE token
3. `src/devices/seq/parse/parse.ts` - Parse glide operator, flatten with tie markers
4. `src/devices/seq/parse.test.ts` - Add glide tests
5. `src/devices/seq/seq.test.ts` - Add runtime glide tests
6. `src/ui/test-suite/test-data.ts` - Add glide test case
