/**
 * Bridge to expose cursor functions to worklet via globalThis.
 *
 * This imports from the shared cursor module and attaches to globalThis
 * for use by the seq device process function.
 */

import { createCursor } from "../../devices/seq/cursor/create";
import { stepCursor, resetCursor } from "../../devices/seq/cursor/step";
import { sampleCursor } from "../../devices/seq/cursor/sample";
import { countBeats } from "../../devices/seq/expr/traverse";

// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).seqCursor = {
	createCursor,
	stepCursor,
	resetCursor,
	sampleCursor,
	countBeats,
};
