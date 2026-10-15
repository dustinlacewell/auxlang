/**
 * `loop(f)` — feedback as a fixpoint. Creates a `z1` placeholder (the unit
 * delay every legal cycle must pass through), runs the body with a handle to
 * it, then wires the body's output back into the placeholder as a z-edge
 * (read one sample late). Returns the handle to the RESULT, so chaining and
 * `.out()` after loop tap the loop body output with the back-edge in place.
 *
 * `loop(init, f)` carries several wires as a record (patch/loop-record).
 */

import { evalCtx } from "./context";
import { wrap } from "./handle";
import { type Handle, handleData, isHandle } from "./handle-data";
import { loopRecord } from "./loop-record";
import { feedInto, feedbackPlaceholder } from "./loop-wire";
import type { WireRecord } from "./wire-record";

export function loop(f: (fed: Handle) => unknown): Handle;
export function loop<K extends string>(
	init: Readonly<Record<K, number>>,
	f: (fed: Readonly<Record<K, Handle>>) => unknown,
): WireRecord<K>;
export function loop(first: unknown, second?: unknown): Handle | WireRecord<string> {
	evalCtx("loop()");
	if (second !== undefined) return loopRecord(first, second);
	return loopWire(first);
}

function loopWire(f: unknown): Handle {
	if (typeof f !== "function") {
		throw new Error("loop(f): f must be a function of the fed-back handle");
	}
	const placeholder = feedbackPlaceholder();
	const result = f(wrap(placeholder));
	if (!isHandle(result)) {
		throw new Error("loop(f): f must return a handle (the loop body output to feed back)");
	}
	feedInto(placeholder, handleData(result), "loop(f) feedback");
	return result;
}
