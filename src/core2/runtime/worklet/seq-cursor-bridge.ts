/**
 * Bridge to expose cursor functions to worklet via globalThis.
 *
 * This imports from the shared cursor module and attaches to globalThis
 * for use by the seq device process function.
 */

import { createCursor } from "../../devices/seq/cursor/create";
import { stepCursor, resetCursor } from "../../devices/seq/cursor/step";
import { sampleCursor } from "../../devices/seq/cursor/sample";
import { getTraversalState } from "../../devices/seq/cursor/get-traversal-state";
import { countBeats } from "../../devices/seq/expr/count-beats";

// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).seqCursor = {
	createCursor,
	stepCursor,
	resetCursor,
	sampleCursor,
	getTraversalState,
	countBeats,
};
