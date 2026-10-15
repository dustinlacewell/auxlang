/**
 * The path for one hop of compile/first-paths, across sub-patch scopes
 * (graph/scope). The hop writes `}` for each scope left, then `name{` for
 * each scope entered, outermost first, so a node inside an instance reads as
 * nested under the instance's place: `out/in<voice{lpf/in<saw`. A hop within
 * one scope adds nothing.
 *
 * Entering a pinned instance (`.id(name)`) restarts the path at the pin:
 * `#name{saw`. The inner places then hang under the pin, not under where the
 * instance sits, so moving it in the code keeps its inner state.
 */

import { type Scope, scopeChain } from "../graph/scope";

export function hopPath(
	path: string,
	port: string,
	from: Scope | undefined,
	to: Scope | undefined,
	module: string,
): string {
	const { exits, entered } = crossing(from, to);
	const pinned = entered.map((s) => s.pin !== undefined).lastIndexOf(true);
	if (pinned >= 0) {
		return `#${entered[pinned]?.pin}{${opened(entered.slice(pinned + 1))}${module}`;
	}
	return `${path}/${port}<${"}".repeat(exits)}${opened(entered)}${module}`;
}

/** Scopes left (a count) and entered (outermost first) going from `from` to `to`. */
function crossing(
	from: Scope | undefined,
	to: Scope | undefined,
): { exits: number; entered: Scope[] } {
	if (from === to) return { exits: 0, entered: [] };
	const fromChain = scopeChain(from);
	const toChain = scopeChain(to);
	const shared = toChain.find((s) => fromChain.includes(s));
	const exits = shared === undefined ? fromChain.length : fromChain.indexOf(shared);
	const entered = shared === undefined ? toChain : toChain.slice(0, toChain.indexOf(shared));
	return { exits, entered: entered.reverse() };
}

function opened(scopes: readonly Scope[]): string {
	return scopes.map((s) => `${s.module}{`).join("");
}
