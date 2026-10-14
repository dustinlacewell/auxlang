/**
 * `out()` — the only effect in the language. Creates an `out` module node and
 * registers it as a root of the current eval. Two shapes reach the master bus:
 *
 *  - `out(x)` / `x.out()` — a whole-module connection (`connectWhole`). A
 *    mono/poly source lands in the auto-spread `in` jack; a stereo source
 *    (`pan`) connects by name, l→l and r→r, keeping its own placement.
 *  - `out({ l, r })` — the general stereo form: patch any two signals straight
 *    to the master's left/right jacks.
 */

import type { GNode, InputValue } from "../graph/node";
import { getModule } from "../module/define";
import { connectWhole } from "./connect";
import { evalCtx } from "./context";
import { type HandleData, handleData, isHandle } from "./handle-data";
import { lift } from "./lift";
import { STEREO_PORTS } from "./stereo";

/** Build the `out` node with the given input bindings and root it. */
function rootOut(inputs: Record<string, InputValue>): void {
	const ctx = evalCtx("out()");
	const node: GNode = { module: "out", inputs, config: {} };
	ctx.roots.push(node);
}

export function out(value: unknown): void {
	if (isStereoArgs(value)) {
		rootOut(liftStereoJacks(value as Record<string, unknown>));
		return;
	}
	if (isHandle(value)) {
		rootFromHandle(handleData(value));
		return;
	}
	rootOut({ [getModule("out").defaultIn]: lift(value, "out()") });
}

/** A plain object naming stereo jacks (not itself a signal value). */
function isStereoArgs(v: unknown): boolean {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	if (isHandle(v)) return false;
	const o = v as Record<string, unknown>;
	if (typeof o.module === "string" && typeof o.inputs === "object") return false; // raw GNode
	if (typeof o.ast === "object" && o.ast !== null) return false; // P-like pattern
	return STEREO_PORTS.some((j) => j in o);
}

function liftStereoJacks(named: Record<string, unknown>): Record<string, InputValue> {
	const inputs: Record<string, InputValue> = {};
	for (const [key, value] of Object.entries(named)) {
		if (!STEREO_PORTS.includes(key as (typeof STEREO_PORTS)[number])) {
			throw new Error(
				`out({ ... }): unknown jack '${key}'. The stereo form names only [${STEREO_PORTS.join(", ")}]. For a mono source use out(x).`,
			);
		}
		inputs[key] = lift(value, `out.${key}`);
	}
	return inputs;
}

/** The handle's `.out()`: connect the handle to the master whole, by name. */
export function rootFromHandle(data: HandleData): void {
	rootOut(connectWhole(data, getModule("out")));
}
