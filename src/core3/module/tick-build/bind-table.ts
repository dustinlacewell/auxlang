/**
 * Bind a tick's table intrinsics (tick-subset/table-intrinsics.ts) to the
 * lane's scratch table (bridge/lane-table.ts), through the tick's state and
 * config parameters:
 *
 *   __tableFill(c)        →  __auxTableFill(s, cfg, c)
 *   __tableCycle()        →  __auxTable(s).cycle
 *   __tableCount()        →  __auxTable(s).count
 *   __tableRow("f", r)    →  __auxTable(s).f[r]
 *
 * Arguments keep their text, so intrinsics and draws inside them are still
 * rewritten. The subset check has made sure the parameters are named.
 */

import type { CallExpression } from "acorn";
import type { ParsedFunction } from "../tick-subset/parse-function";
import { TABLE_INTRINSICS } from "../tick-subset/table-intrinsics";
import { walk } from "../tick-subset/walk";
import type { TextEdit } from "./text-edits";

/** The bound names of the lane's table and its fill (bridge/lane-table.ts) inside a built tick. */
export const TABLE_OF = "__auxTable";
export const TABLE_FILL = "__auxTableFill";

export function bindTable(tick: ParsedFunction): TextEdit[] {
	const [state, , , config] = tick.node.params;
	if (state?.type !== "Identifier" || config?.type !== "Identifier") return [];
	const edits: TextEdit[] = [];
	walk(tick.node.body, (node) => {
		if (node.type === "CallExpression") edits.push(...callEdits(node, state.name, config.name));
	});
	return edits;
}

function callEdits(call: CallExpression, state: string, config: string): TextEdit[] {
	if (call.callee.type !== "Identifier" || !TABLE_INTRINSICS.has(call.callee.name)) return [];
	const [first, second] = call.arguments;
	const table = `${TABLE_OF}(${state})`;
	switch (call.callee.name) {
		case "__tableFill":
			return first === undefined
				? []
				: [{ start: call.start, end: first.start, text: `${TABLE_FILL}(${state}, ${config}, ` }];
		case "__tableCycle":
			return [{ start: call.start, end: call.end, text: `${table}.cycle` }];
		case "__tableCount":
			return [{ start: call.start, end: call.end, text: `${table}.count` }];
		default:
			if (first?.type !== "Literal" || second === undefined) return [];
			return [
				{ start: call.start, end: second.start, text: `${table}.${String(first.value)}[` },
				{ start: second.end, end: call.end, text: "]" },
			];
	}
}
