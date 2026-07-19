/**
 * `loop(f)` — feedback as a fixpoint. Creates a `z1` placeholder (the unit
 * delay every legal cycle must pass through), runs the body with a handle to
 * it, then wires the body's output back into the placeholder as a z-edge
 * (read one sample late). Returns the handle to the RESULT, so chaining and
 * `.out()` after loop tap the loop body output with the back-edge in place.
 */

import type { GNode } from "../graph/node";
import { getModule } from "../module/define";
import { evalCtx } from "./context";
import { wrap } from "./handle";
import { type Handle, handleData, isHandle } from "./handle-data";
import { resolvePatchModule } from "./resolve";

export function loop(f: (fed: Handle) => unknown): Handle {
	evalCtx("loop()");
	const z1 = getModule("z1");
	const placeholder: GNode = { module: "z1", inputs: {}, config: {} };

	const result = f(wrap(placeholder));
	if (!isHandle(result)) {
		throw new Error("loop(f): f must return a handle (the loop body output to feed back)");
	}

	const data = handleData(result);
	const port = data.port ?? resolvePatchModule(data.node.module).defaultOut;
	placeholder.inputs[z1.defaultIn] = { z: { node: data.node, port } };
	return result;
}
