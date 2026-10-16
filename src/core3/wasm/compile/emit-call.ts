/**
 * Calls: exact `Math.*`, bridge intrinsics, and helpers. A helper is
 * specialised on the arguments known while compiling (config strings,
 * booleans, arrays and records); run-time arguments are its parameters. Arguments
 * are evaluated in order. A helper that uses the math cache takes its lane's
 * cache address first. A tick's state record passes as its address.
 */

import type { CallExpression, Expression } from "acorn";
import { isAggregate } from "../layout/state-shape";
import { toF64 } from "./coerce";
import type { ArgShape, FnRef, StateRecord } from "./emit-context";
import { emitExpr } from "./emit-expression";
import { emitMathCall } from "./exact-math";
import type { FnEmitter } from "./fn-emitter";
import { placeOf } from "./place";
import type { Kind } from "./values";

export function emitCall(e: FnEmitter, node: CallExpression): Kind | "void" {
	const callee = node.callee;
	if (node.optional) return e.fail(node, "optional calls are not allowed");
	if (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.object.name === "Math" &&
		e.scope.lookup("Math") === undefined &&
		callee.property.type === "Identifier"
	)
		return emitMathCall(e, callee.property.name, node);
	if (callee.type !== "Identifier" || e.scope.lookup(callee.name) !== undefined)
		return e.fail(node, "only Math.*, helpers and intrinsics may be called");
	const args = plainArgs(e, node);
	const intrinsic = e.ctx.intrinsics?.call(e, callee.name, args, node) ?? null;
	if (intrinsic !== null) return intrinsic;
	if (!e.ctx.calls.hasHelper(callee.name))
		return e.fail(node, `'${callee.name}' is not a helper the WASM backend knows`);
	return emitHelperCall(e, callee.name, args);
}

function emitHelperCall(e: FnEmitter, name: string, args: readonly Expression[]): Kind {
	const shapes: ArgShape[] = [];
	const values: number[][] = [];
	let state: StateRecord | null = null;
	for (const arg of args) {
		const record = stateArg(e, arg);
		if (record !== null) {
			shapes.push({ k: "memory", shape: record.shape, offset: 0, dynamic: true });
			values.push(e.capture(() => e.code.i32Const(record.address)).bytes);
			state = record;
			continue;
		}
		const known = knownShape(e, arg);
		if (known !== null) {
			shapes.push(known.shape);
			if (known.bytes !== null) values.push(known.bytes);
			continue;
		}
		const run = e.capture(() => runArg(e, arg));
		shapes.push({ k: "run", kind: run.value });
		values.push(run.bytes);
	}
	const fn = e.ctx.calls.helper(name, shapes);
	pushHidden(e, fn);
	for (const bytes of values) e.code.append(bytes);
	state?.flush();
	e.code.call(fn.index);
	state?.reload();
	return fn.result;
}

/** A tick's own state record as an argument: the helper reads and writes it in memory. */
function stateArg(e: FnEmitter, arg: Expression): StateRecord | null {
	if (arg.type !== "Identifier") return null;
	const value = e.scope.lookup(arg.name);
	if (value?.k !== "role" || value.role !== "state" || e.ctx.roles === null) return null;
	return e.ctx.roles.stateRecord(arg);
}

/**
 * A string, boolean, undefined, array or record argument specialises the
 * helper. An array or record at a run-time address passes that address:
 * `bytes` compute it.
 */
function knownShape(e: FnEmitter, arg: Expression): KnownArg | null {
	const folded = e.fold(arg);
	if (folded !== null && typeof folded.v !== "number")
		return { shape: { k: "static", value: folded.v }, bytes: null };
	const placed = e.capture(() => placeOf(e, arg));
	const value = placed.value;
	if (value?.k !== "memory" || !isAggregate(value.shape)) return null;
	const { base, offset } = value.at;
	const shape: ArgShape = { k: "memory", shape: value.shape, offset, dynamic: base !== null };
	if (base === null) return { shape, bytes: null };
	return { shape, bytes: [...placed.bytes, ...e.capture(() => e.code.get(base)).bytes] };
}

interface KnownArg {
	readonly shape: ArgShape;
	/** The code that passes it, when it is passed at run time. */
	readonly bytes: number[] | null;
}

/** A run-time argument: an int is passed as the number it is. */
function runArg(e: FnEmitter, arg: Expression): "f64" | "bool" {
	const kind = emitExpr(e, arg);
	if (kind === "bool") return "bool";
	toF64(e, kind);
	return "f64";
}

function pushHidden(e: FnEmitter, fn: FnRef): void {
	if (!fn.hidden) return;
	const cache = e.ctx.cache;
	if (cache === null) throw new Error(`wasm: ${e.ctx.owner}: a cached helper needs a math cache`);
	if (cache.k === "locals") e.code.i32Const(cache.address);
	else e.code.get(cache.base);
}

function plainArgs(e: FnEmitter, node: CallExpression): Expression[] {
	return node.arguments.map((arg) =>
		arg.type === "SpreadElement" ? e.fail(arg, "spread arguments are not allowed") : arg,
	);
}
