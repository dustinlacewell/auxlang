/**
 * Worklet bridge for sequencer position extraction.
 * Makes extractPositionsForBeat available in the worklet global scope.
 */

import { extractPositionsForBeat } from "../../devices/seq/extract-beat-positions";
import type { Expr } from "../../devices/seq/expr/types";

// Expose to worklet global scope
(globalThis as any).extractPositionsForBeat = extractPositionsForBeat;

// Also export for type safety
export { extractPositionsForBeat };
