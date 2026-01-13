/**
 * Bridge to expose cursor functions to worklet via globalThis.
 *
 * This imports from the shared cursor module and attaches to globalThis
 * for use by the seq device process function.
 */

import { createCursor } from "@/core2/devices/seq/cursor/create";
import { stepCursor, resetCursor } from "@/core2/devices/seq/cursor/step";
import { sampleCursor } from "@/core2/devices/seq/cursor/sample";
import { countBeats } from "@/core2/devices/seq/expr/traverse";

// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).seqCursor = {
	createCursor,
	stepCursor,
	resetCursor,
	sampleCursor,
	countBeats,
};
