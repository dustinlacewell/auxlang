/**
 * A pasted function's body as lines. A block body prints its statements; an
 * arrow's expression body is the value it returns.
 */

import type { FunctionNode } from "../../../module/tick-subset/parse-function";
import type { PasteContext } from "./paste-context";
import { printStatement, printStatements } from "./print-statement";

export function printBody(fn: FunctionNode, ctx: PasteContext): string[] {
	if (fn.body.type === "BlockStatement") return printStatements(fn.body.body, ctx);
	return printStatement({ type: "ReturnStatement", argument: fn.body, start: 0, end: 0 }, ctx);
}
