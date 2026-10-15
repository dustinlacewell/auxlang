/**
 * A signal lambda's function text from the source the engine gets
 * (module/bind-math/bind-lambda-math.ts): that source itself when the lambda
 * uses no auxlang math, else the function its wrapper returns. That function
 * already calls auxlang's math (`__math_*`) through its own call cache
 * (`__mc[slot]`). The wrapper's copies of the math library and its cache
 * array are the JS form of those; WASM calls the shared library and keeps
 * the cache in memory.
 */

import { type AnyNode, parse } from "acorn";

export function lambdaText(bound: string): string {
	const fn = wrapped(bound);
	return fn === null ? bound : bound.slice(fn.start, fn.end);
}

/** The function `(() => { ...; return (fn); })()` returns, or null when `bound` is not that form. */
function wrapped(bound: string): AnyNode | null {
	let statement: AnyNode | undefined;
	try {
		statement = parse(bound, { ecmaVersion: "latest" }).body[0] as AnyNode | undefined;
	} catch {
		return null;
	}
	if (statement?.type !== "ExpressionStatement") return null;
	const call = statement.expression;
	if (call.type !== "CallExpression" || call.callee.type !== "ArrowFunctionExpression") return null;
	const body = call.callee.body;
	if (body.type !== "BlockStatement") return null;
	const last = body.body[body.body.length - 1];
	if (last?.type !== "ReturnStatement" || last.argument === null || last.argument === undefined)
		return null;
	const fn = last.argument;
	return fn.type === "ArrowFunctionExpression" || fn.type === "FunctionExpression" ? fn : null;
}
