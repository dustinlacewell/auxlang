/**
 * One helper specialised on its argument shapes, as a function body. Its
 * plan (module/front/types/) for these shapes types every node and gives
 * the result kind: a boolean when every `return` gives one, else an f64.
 * The checker (module/front/kinds/) rejects a helper that returns both.
 */

import type { Expression, ReturnStatement } from "acorn";
import type { FunctionIR } from "../../module/front/module/module-ir";
import { calleesOf } from "../../module/front/types/callees";
import type { FunctionPlan } from "../../module/front/types/function-plan";
import { helperPlan } from "../../module/front/types/helper-plans";
import { BOOL, NUM, type Ty, known, ref } from "../../module/front/types/ty";
import { I32 } from "../encode/opcodes";
import { addressLocal } from "./address-variable";
import type { ArgShape, Calls } from "./emit-context";
import { emitStatic } from "./emit-expression";
import { emitStatement, emitStatements } from "./emit-statement";
import { FnEmitter, valueType } from "./fn-emitter";
import type { HelperSet } from "./helper-set";
import { refShape } from "./shape-ty";
import { type Kind, fixed, inMemory, local } from "./values";
import { paramWritten } from "./written";

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
	const ir = set.fns.get(name);
	if (ir === undefined) throw new Error(`wasm: ${set.owner} has no helper '${name}'`);
	const owner = `${set.owner} helper '${name}'`;
	const plan = helperPlan({ ir, callees: calleesOf(set.fns) }, shapes.map(paramTy));
	if (plan === null) throw new Error(`wasm: ${owner}: calls itself`);
	return build(plan, shapes, calls, set.cached, owner);
}

/** What the helper's plan takes for an argument of this shape. */
function paramTy(shape: ArgShape): Ty {
	if (shape.k === "run") return shape.kind === "bool" ? BOOL : NUM;
	if (shape.k === "static") return known(shape.value);
	return ref(refShape(shape.shape));
}

function build(
	plan: FunctionPlan,
	shapes: readonly ArgShape[],
	calls: Calls,
	hidden: boolean,
	owner: string,
): CompiledHelper {
	const ir = plan.ir;
	const result: Kind = plan.result === "bool" ? "bool" : "f64";
	const fn = ir.node;
	if (shapes.length > fn.params.length)
		throw new Error(
			`wasm: ${owner}: called with ${shapes.length} arguments for ${fn.params.length}`,
		);
	const params: number[] = hidden ? [I32] : [];
	for (const s of shapes) {
		if (s.k === "run") params.push(valueType(s.kind));
		else if (s.k === "memory" && s.dynamic) params.push(I32);
	}
	const e = new FnEmitter(params, {
		owner,
		fn: ir,
		plan,
		roles: null,
		cache: hidden ? { k: "memory", base: 0 } : null,
		calls,
		intrinsics: null,
		ret: { k: "value", kind: result },
	});
	bindParams(e, ir, shapes, hidden ? 1 : 0);
	if (fn.body.type === "BlockStatement") emitStatements(e, fn.body.body);
	else emitStatement(e, returnOf(fn.body));
	if (result === "f64") e.code.f64Const(Number.NaN);
	else e.code.i32Const(0);
	return { params, locals: e.locals, body: e.code.bytes, result };
}

/**
 * A known argument the helper reassigns becomes a local holding it; an
 * array or record one, an i32 local holding its address (address-variable.ts).
 */
function bindParams(
	e: FnEmitter,
	ir: FunctionIR,
	shapes: readonly ArgShape[],
	first: number,
): void {
	let next = first;
	ir.node.params.forEach((param, k) => {
		if (param.type !== "Identifier") return e.fail(param, "parameters must be plain names");
		const shape: ArgShape = shapes[k] ?? { k: "static", value: undefined };
		if (shape.k === "run") e.bind(param, local(next++, shape.kind));
		else if (shape.k === "static" && paramWritten(ir, k)) {
			const kind = emitStatic(e, shape.value, param);
			const index = e.local(kind);
			e.code.set(index);
			e.bind(param, local(index, kind));
		} else if (shape.k === "static") e.bind(param, fixed(shape.value));
		else {
			const at = { base: shape.dynamic ? next++ : null, offset: shape.offset };
			const held = inMemory(shape.shape, at);
			e.bind(param, paramWritten(ir, k) ? addressLocal(e, held) : held);
		}
	});
}

/** An arrow's expression body as the statement it means. */
function returnOf(body: Expression): ReturnStatement {
	const at = { type: "ReturnStatement", argument: body, start: body.start, end: body.end } as const;
	return body.loc === null || body.loc === undefined ? at : { ...at, loc: body.loc };
}
