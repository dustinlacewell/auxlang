/**
 * The patch seed used when the patch does not set one. The one place this
 * value lives. `runEval(fn, { seed })` overrides it; the seed flows through
 * `EvalResult.seed` → `Program.seed` → the engine, which derives every
 * module's random stream from it (see stream-seed.ts).
 */
export const DEFAULT_SEED = 1;
