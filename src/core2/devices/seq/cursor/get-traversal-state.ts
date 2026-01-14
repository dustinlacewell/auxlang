/**
 * Extract TraversalState from a cursor for use in visualization/traversal.
 */

import type { Cursor } from "./types";
import type { TraversalState } from "../traverse/types";

/**
 * Get a TraversalState from a cursor, ensuring both fields exist.
 * This is the single point of conversion from cursor internals to traversal API.
 */
export function getTraversalState(cursor: Cursor): TraversalState {
	return {
		probDecisions: cursor.probDecisions,
		altPositions: cursor.altPositions,
	};
}
