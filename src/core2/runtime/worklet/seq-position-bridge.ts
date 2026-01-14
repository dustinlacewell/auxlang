/**
 * Worklet bridge for sequencer position extraction.
 * Makes extractPositionsForBeat available in the worklet global scope.
 */

import { extractPositionsForBeat } from "../../devices/seq/visitors/extract-positions";

// Expose to worklet global scope
(globalThis as any).extractPositionsForBeat = extractPositionsForBeat;

// Also export for type safety
export { extractPositionsForBeat };
