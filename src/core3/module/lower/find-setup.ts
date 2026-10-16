/**
 * Find the `defmod` call a setup function came from: the file is searched for
 * a `defmod(...)` call whose last argument's source text matches the setup's
 * `toString()` exactly, byte for byte (`protected-spans.ts` keeps a defmod
 * call's arguments untouched by other rewrites, so this always finds the
 * right one when the setup came from this file).
 */

import type { ArrowFunctionExpression, CallExpression, FunctionExpression, Program } from "acorn";
import { walk } from "../front/parse/walk";

export interface FoundSetup {
	readonly call: CallExpression;
	readonly setup: ArrowFunctionExpression | FunctionExpression;
	/** The setup node's start offset in the file text. */
	readonly offset: number;
}

export function findSetup(program: Program, text: string, setupText: string): FoundSetup | null {
	let found: FoundSetup | null = null;
	walk(program as unknown as Parameters<typeof walk>[0], (node) => {
		if (found !== null) return;
		if (node.type !== "CallExpression") return;
		const call = node as CallExpression;
		if (call.callee.type !== "Identifier" || call.callee.name !== "defmod") return;
		const last = call.arguments[call.arguments.length - 1];
		if (last === undefined) return;
		if (last.type !== "ArrowFunctionExpression" && last.type !== "FunctionExpression") return;
		if (text.slice(last.start, last.end) !== setupText) return;
		found = { call, setup: last, offset: last.start };
	});
	return found;
}
