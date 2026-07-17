/**
 * Coerce a user-facing pattern argument — mini-notation string, `p`-template
 * `P`, or raw `Pat` data — into serializable Pat AST data. Loud on anything else.
 */

import type { Pat } from "../pattern/ast";
import { parseNotation } from "../pattern/notation/parse";
import { isP } from "../pattern/pat-class";

export function patternAst(value: unknown, where: string): Pat {
	if (typeof value === "string") return parseNotation([value], []);
	if (isP(value)) return value.ast;
	if (isPatData(value)) return value;
	throw new Error(
		`${where}: expected a pattern (mini-notation string, p\`...\`, or Pat data), got ${describe(value)}`,
	);
}

function isPatData(v: unknown): v is Pat {
	return typeof v === "object" && v !== null && typeof (v as { op?: unknown }).op === "string";
}

function describe(v: unknown): string {
	if (v === null) return "null";
	if (v === undefined) return "undefined";
	return `a ${typeof v} (${String(v).slice(0, 40)})`;
}
