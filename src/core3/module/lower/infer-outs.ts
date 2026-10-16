/**
 * A tick's outputs, read from its `return` statements: `return expr` names
 * one output, `out`; `return { l: a, r: b }` names one per key. Every return
 * must agree on the same key set, and a tick that returns a value anywhere
 * must end its body in a `return` (else a path falls through with no
 * output). Each return becomes text edits writing the internal output
 * object instead, e.g. `__dsp_o.out = (expr); return;` — the edits wrap each
 * value expression without touching its own span, so `tick-text.ts`'s
 * identifier rewrites inside that span apply in the same `applyEdits` pass.
 */

import type { AnyNode, ArrowFunctionExpression, BlockStatement, Expression, ReturnStatement } from "acorn";
import { walk } from "../front/parse/walk";
import type { TextEdit } from "../tick-build/text-edits";

export interface InferredOuts {
	readonly outs: readonly string[];
	readonly edits: readonly TextEdit[];
	/** The tick's second param, when present: the output object for groups. */
	readonly outParam: string | null;
}

export function inferOuts(tick: ArrowFunctionExpression, moduleName: string): InferredOuts {
	const what = `module '${moduleName}'`;
	const outParam = secondParamName(tick, what);
	const returns = collectReturns(tick);

	if (returns.length === 0) return { outs: [], edits: [], outParam };

	const keySets = returns.map((ret) => keysOf(ret, what));
	const first = keySets[0] as readonly string[];
	for (const keys of keySets) {
		if (!sameKeys(first, keys)) {
			throw new Error(
				`${what}: every 'return' must name the same outputs; found ${first.join(", ")} and ${keys.join(", ")}`,
			);
		}
	}
	assertEndsInReturn(tick, what);

	const isExprBody = tick.body.type !== "BlockStatement";
	const edits = returns.flatMap((ret) => editsFor(ret, what, isExprBody));
	return { outs: first, edits, outParam };
}

function secondParamName(tick: ArrowFunctionExpression, what: string): string | null {
	const second = tick.params[1];
	if (second === undefined) return null;
	if (second.type !== "Identifier") {
		throw new Error(
			`${what}: the tick's second param, when present, must be a plain name for the output group object`,
		);
	}
	return second.name;
}

function collectReturns(tick: ArrowFunctionExpression): ReturnStatement[] {
	if (tick.body.type !== "BlockStatement") {
		// An expression-bodied arrow is one implicit `return expr`.
		return [exprBodyAsReturn(tick)];
	}
	const found: ReturnStatement[] = [];
	walk(tick.body, (node) => {
		if (node.type === "ReturnStatement") found.push(node as ReturnStatement);
	});
	return found;
}

/** A synthetic return standing for an expression-bodied arrow's implicit value, same span as the body. */
function exprBodyAsReturn(tick: ArrowFunctionExpression): ReturnStatement {
	const body = tick.body as Expression;
	return { type: "ReturnStatement", start: body.start, end: body.end, argument: body } as unknown as ReturnStatement;
}

function keysOf(ret: ReturnStatement, what: string): readonly string[] {
	const arg = ret.argument;
	if (arg === null || arg === undefined) {
		throw new Error(`${what}: a tick that returns a value elsewhere must not have a bare 'return'`);
	}
	if (arg.type === "ObjectExpression") return objectKeys(arg, what);
	return ["out"];
}

function objectKeys(obj: AnyNode & { properties: AnyNode[] }, what: string): readonly string[] {
	const keys: string[] = [];
	for (const prop of obj.properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier" || prop.computed) {
			throw new Error(`${what}: a returned output object may only have plain named properties`);
		}
		keys.push(prop.key.name);
	}
	return keys;
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false;
	const set = new Set(a);
	return b.every((k) => set.has(k));
}

function assertEndsInReturn(tick: ArrowFunctionExpression, what: string): void {
	if (tick.body.type !== "BlockStatement") return;
	const body = tick.body as BlockStatement;
	const last = body.body[body.body.length - 1];
	if (last === undefined || last.type !== "ReturnStatement") {
		throw new Error(`${what}: a tick that returns a value must end its body in a 'return'`);
	}
}

/**
 * Wraps each value expression in the return with `__dsp_o.<key> = (` ... `)`,
 * never touching the expression's own span. An expression-bodied arrow's
 * synthetic return (exprBodyAsReturn) has no enclosing braces or `return`
 * keyword in the source, so its edit wraps the whole thing in a block too —
 * `=> expr` becomes `=> { __dsp_o.out = (expr); return; }` — keeping the
 * rewritten source a valid function body.
 */
function editsFor(ret: ReturnStatement, what: string, isExprBody: boolean): TextEdit[] {
	const arg = ret.argument as NonNullable<ReturnStatement["argument"]>;
	const open = isExprBody ? "{ " : "";
	const close = isExprBody ? " }" : "";
	if (arg.type !== "ObjectExpression") {
		return [
			{ start: ret.start, end: arg.start, text: `${open}__dsp_o.out = (` },
			{ start: arg.end, end: ret.end, text: `); return;${close}` },
		];
	}
	const props = objectProps(arg, what);
	const edits: TextEdit[] = [];
	let cursor = ret.start;
	for (const prop of props) {
		const opener =
			cursor === ret.start ? `${open}__dsp_o.${prop.key} = (` : `); __dsp_o.${prop.key} = (`;
		edits.push({ start: cursor, end: prop.value.start, text: opener });
		cursor = prop.value.end;
	}
	edits.push({ start: cursor, end: ret.end, text: `); return;${close}` });
	return edits;
}

function objectProps(
	obj: AnyNode & { properties: AnyNode[] },
	what: string,
): readonly { key: string; value: Expression }[] {
	const props: { key: string; value: Expression }[] = [];
	for (const prop of obj.properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier" || prop.computed) {
			throw new Error(`${what}: a returned output object may only have plain named properties`);
		}
		props.push({ key: prop.key.name, value: prop.value as Expression });
	}
	return props;
}
