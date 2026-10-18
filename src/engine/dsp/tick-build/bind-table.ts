/**
 * Bind a tick's table intrinsics (front/intrinsics/table-intrinsics.ts) to the
 * lane's scratch table (bridge/lane-table.ts: a pattern-reading lane is born
 * with one), through the tick's state and config parameters:
 *
 *   __tableFill(c)        →  __auxTableFill(s, cfg, c)
 *   __tableCycle()        →  s.__scratch.table.cycle
 *   __tableCount()        →  s.__scratch.table.count
 *   __tableRow("f", r)    →  s.__scratch.table.f[r]
 *   __tableField(k, r)    →  s.__scratch.table.fields[k][r]
 *
 * Reads are plain field loads, as fast as the TypeScript tick they replace.
 * Arguments keep their text, so intrinsics and draws inside them are still
 * rewritten. The subset check has made sure the parameters are named.
 */

import type { CallExpression } from "acorn";
import { TABLE_INTRINSICS } from "../front/intrinsics/table-intrinsics";
import type { ParsedFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import type { TextEdit } from "./text-edits";

/** The bound name of the lane's table fill (bridge/lane-table.ts) inside a built tick. */
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
	const table = `${state}.__scratch.table`;
	switch (call.callee.name) {
		case "__tableFill":
			return first === undefined
				? []
				: [{ start: call.start, end: first.start, text: `${TABLE_FILL}(${state}, ${config}, ` }];
		case "__tableCycle":
			return [{ start: call.start, end: call.end, text: `${table}.cycle` }];
		case "__tableCount":
			return [{ start: call.start, end: call.end, text: `${table}.count` }];
		case "__tableField":
			if (first === undefined || second === undefined) return [];
			return [
				{ start: call.start, end: first.start, text: `${table}.fields[` },
				{ start: first.end, end: second.start, text: "][" },
				{ start: second.end, end: call.end, text: "]" },
			];
		default:
			if (first?.type !== "Literal" || second === undefined) return [];
			return [
				{ start: call.start, end: second.start, text: `${table}.${String(first.value)}[` },
				{ start: second.end, end: call.end, text: "]" },
			];
	}
}
