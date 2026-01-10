# Current Task

**API cleanup and documentation** - Complete

## Completed

1. ✅ Removed `vca` device (redundant with `gain`)
2. ✅ Renamed `gain.amount` to `gain.level` for clarity
3. ✅ Updated all usages across codebase (43 test files, editor, out.ts)
4. ✅ Rewrote `.claude/rules/auxlang-guide.md` - comprehensive quick reference

## Key Changes

**Device Cleanup (D083):**
- `vca` removed - use `gain({ level: envelope })` for amplitude modulation
- `gain.amount` → `gain.level` - clearer naming for modulation input
- Files: `src/devices/gain.ts`, `src/editor/api.ts`, all test cases

**Documentation:**
- `.claude/rules/auxlang-guide.md` - Complete rewrite covering:
  - Core concepts (signals, descriptors, devices)
  - Pattern syntax (mini-notation DSL)
  - JavaScript API (instantiation, chaining, output access)
  - Polyphony (pattern-level, JS-level, voice access)
  - Common patterns and gotchas

## Next Steps

1. Mono/Uzu refactor (D069-D078)
2. Document WASM device authoring with serialization interface
