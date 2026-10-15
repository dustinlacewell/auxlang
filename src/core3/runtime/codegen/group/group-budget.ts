/**
 * The size budget of one group of the grouped driver, in estimated bytes of
 * V8 bytecode (paste/node-cost.ts): consecutive components merge while their
 * total fits, so groups stay small and each reaches TurboFan on its own.
 *
 * Measured (Node 24, `perf-steady.ts --only=… --group=…`, one driver per
 * process, representative / wide pads / coastline): budgets 0–2000 gave the
 * best cold (first 5 s) and warm numbers, 2000 slightly ahead on the
 * representative patch; 4000 lost ~40 % cold on coastline; 8000 lost on
 * all three, cold and warm.
 */
export const GROUP_BUDGET = 2_000;
