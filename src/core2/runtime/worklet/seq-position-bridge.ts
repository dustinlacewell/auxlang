/**
 * Worklet bridge for sequencer position/ID extraction.
 * Makes extraction functions available in the worklet global scope.
 */

import { extractPositionsForBeat, extractActiveIdsForBeat } from "../../devices/seq/visitors/extract-positions";

// Expose to worklet global scope
// biome-ignore lint/suspicious/noExplicitAny: worklet global
(globalThis as any).extractPositionsForBeat = extractPositionsForBeat;
// biome-ignore lint/suspicious/noExplicitAny: worklet global
(globalThis as any).extractActiveIdsForBeat = extractActiveIdsForBeat;

// Also export for type safety
export { extractPositionsForBeat, extractActiveIdsForBeat };
