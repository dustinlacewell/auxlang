/**
 * Wrap each traced call in the trace: `CALL` becomes
 *
 *   __aux.leave(__aux.enter(ID), CALL)
 *
 * `enter` pushes the call's site before the callee and arguments evaluate;
 * `leave` pops it and returns the call's value. CALL stays verbatim, so its
 * `this`, argument order and value are unchanged. The wrapper starts with an
 * identifier (no ASI hazard after a line without a semicolon) and adds no
 * newline, so every line of the patch keeps its number.
 */

import type { TracedCall } from "./call-sites";

export const TRACE_NAME = "__aux";

interface Insertion {
	readonly at: number;
	/** 0 closes before 1 opens at the same offset. */
	readonly rank: 0 | 1;
	/** Among opens: outer (later end) first. Among closes: inner (later start) first. */
	readonly order: number;
	readonly text: string;
}

export function instrument(source: string, calls: readonly TracedCall[]): string {
	const insertions = calls.flatMap(insertionsFor).sort(byPlace);
	let code = "";
	let from = 0;
	for (const insertion of insertions) {
		code += source.slice(from, insertion.at) + insertion.text;
		from = insertion.at;
	}
	return code + source.slice(from);
}

function insertionsFor({ site, span }: TracedCall): Insertion[] {
	return [
		{
			at: span.start,
			rank: 1,
			order: -span.end,
			text: `${TRACE_NAME}.leave(${TRACE_NAME}.enter(${site.id}), `,
		},
		{ at: span.end, rank: 0, order: -span.start, text: ")" },
	];
}

function byPlace(a: Insertion, b: Insertion): number {
	return a.at - b.at || a.rank - b.rank || a.order - b.order;
}
