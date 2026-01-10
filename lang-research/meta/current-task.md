# Current Task

**Mono refactor** - Eliminating runtime polyphony via compile-time graph duplication

## What We're Doing

Replacing `PolySignal` (`{id, value}[]`) with mono signals (`number`). Polyphony becomes graph structure, not signal format.

See [plans/polyphony-decomposition.md](../plans/polyphony-decomposition.md) for full design.

## Steps

1. Implement `projectVoice(expr, voiceIndex)` - extract single voice's AST
2. Implement `decomposePattern(expr)` - return array of mono ASTs
3. Modify graph construction - N seqs for N-voice patterns
4. Graph duplication - duplicate downstream devices per voice
5. Mix insertion - collapse voices to stereo
6. Simplify devices - remove all PolySignal handling
7. Kill PolySignal - delete the type and utilities

## After Mono Refactor

Uzu syntax refactor - method chaining, unified input model. See [plans/uzu-design.md](../plans/uzu-design.md).

## Recent Wins

- Blue Monday bass line working
- Mix device sqrt(n) normalization
- Group weighting for `@` modifier
- Full plan docs for mono refactor and Uzu
