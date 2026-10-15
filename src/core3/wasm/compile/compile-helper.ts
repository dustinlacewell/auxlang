/**
 * One helper specialised on its argument shapes, as a function body. The
 * result kind is found by compiling: first with an f64 result; when every
 * `return` gave a boolean, again with a boolean result.
 */

import type { AnyNode, Expression, ReturnStatement } from "acorn";
import { parseFunction } from "../../module/tick-subset/parse-function";
import { I32 } from "../encode/opcodes";
import type { ArgShape, Calls } from "./emit-context";
import { emitStatement, emitStatements } from "./emit-statement";
import { FnEmitter, valueType } from "./fn-emitter";
import type { HelperSet } from "./helper-set";
import { type Kind, fixed, inMemory, local } from "./values";

export interface CompiledHelper {
	readonly params: readonly number[];
	readonly locals: readonly number[];
	readonly body: readonly number[];
	readonly result: Kind;
}

export function compileHelper(
	set: HelperSet,
	name: string,
	shapes: readonly ArgShape[],
	calls: Calls,
): CompiledHelper {
	const text = set.texts[name];
	if (text === undefined) throw new Error(`wasm: ${set.owner} has no helper '${name}'`);
	const fn = parseFunction(text, `${set.owner} helper '${name}'`).node;
	const owner = `${set.owner} helper '${name}'`;
	const first = build(fn, shapes, calls, set.cached, owner, "f64");
	const bools = first.seen.length > 0 && first.seen.every((k) => k === "bool");
	return bools ? build(fn, shapes, calls, set.cached, owner, "bool") : first;
}

function build(
	fn: ReturnType<typeof parseFunction>["node"],
	shapes: readonly ArgShape[],
	calls: Calls,
	hidden: boolean,
	owner: string,
	result: Kind,
): CompiledHelper & { seen: Kind[] } {
	if (shapes.length > fn.params.length)
		throw new Error(
			`wasm: ${owner}: called with ${shapes.length} arguments for ${fn.params.length}`,
		);
	const params: number[] = hidden ? [I32] : [];
	for (const s of shapes) {
		if (s.k === "run") params.push(valueType(s.kind));
		else if (s.k === "memory" && s.dynamic) params.push(I32);
	}
	const seen: Kind[] = [];
	const e = new FnEmitter(params, {
		owner,
		roles: null,
		cache: hidden ? { k: "memory", base: 0 } : null,
		calls,
		intrinsics: null,
		ret: { k: "value", kind: result, seen },
	});
	bindParams(e, fn.params, shapes, hidden ? 1 : 0);
	if (fn.body.type === "BlockStatement") emitStatements(e, fn.body.body);
	else emitStatement(e, returnOf(fn.body));
	if (result === "f64") e.code.f64Const(Number.NaN);
	else e.code.i32Const(0);
	return { params, locals: e.locals, body: e.code.bytes, result, seen };
}

function bindParams(
	e: FnEmitter,
	params: readonly AnyNode[],
	shapes: readonly ArgShape[],
	first: number,
): void {
	let next = first;
	params.forEach((param, k) => {
		if (param.type !== "Identifier") return e.fail(param, "parameters must be plain names");
		const shape: ArgShape = shapes[k] ?? { k: "static", value: undefined };
		if (shape.k === "run") e.scope.declare(param.name, local(next++, shape.kind));
		else if (shape.k === "static") e.scope.declare(param.name, fixed(shape.value));
		else {
			const base = shape.dynamic ? next++ : null;
			e.scope.declare(param.name, inMemory(shape.shape, { base, offset: shape.offset }));
		}
	});
}

/** An arrow's expression body as the statement it means. */
function returnOf(body: Expression): ReturnStatement {
	const at = { type: "ReturnStatement", argument: body, start: body.start, end: body.end } as const;
	return body.loc === null || body.loc === undefined ? at : { ...at, loc: body.loc };
}
