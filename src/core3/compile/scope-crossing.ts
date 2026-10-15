/**
 * The path text for one hop between sub-patch scopes (graph/scope): `}` for
 * each scope left, then `name{` for each scope entered, outermost first. A
 * node inside a sub-patch instance thus reads as nested under the instance's
 * place: `out/in<voice{lpf/in<saw`. A hop within one scope adds nothing.
 */

import { type Scope, scopeChain } from "../graph/scope";

export function scopeCrossing(from: Scope | undefined, to: Scope | undefined): string {
	if (from === to) return "";
	const fromChain = scopeChain(from);
	const toChain = scopeChain(to);
	const shared = toChain.find((s) => fromChain.includes(s));
	const exits = shared === undefined ? fromChain.length : fromChain.indexOf(shared);
	const entered = shared === undefined ? toChain : toChain.slice(0, toChain.indexOf(shared));
	return (
		"}".repeat(exits) +
		entered
			.reverse()
			.map((s) => `${s.module}{`)
			.join("")
	);
}
