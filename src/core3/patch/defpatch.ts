/**
 * `defpatch(name, meta?, fn)` (MANIFESTO §5, shape C): a sub-patch module
 * whose body is ordinary patch JS, written as a plain function of its input
 * handles — `defpatch("bright", ({ in: pitch, cutoff = 84 }) => pitch.saw().lpf(cutoff))`.
 * It maps onto today's `defmod({ name, doc, category, ins, outs, patch })`
 * (subpatch/define-subpatch): `ins` comes from `fn`'s destructured param via
 * the same port inference a shape-C tick uses (lower/infer-ports); `outs` is
 * the key set of a top-level object-literal return, or `{ out }` for a bare
 * expression. `fn` itself needs no same-file context (no helpers, no state,
 * no tick rewrite) — it is parsed standalone from `fn.toString()`.
 */

import type { ArrowFunctionExpression } from "acorn";
import { parseFunction } from "../module/front/parse/parse-function";
import { findSetup } from "../module/lower/find-setup";
import { fileProgram } from "../module/lower/file-program";
import { inferOuts } from "../module/lower/infer-outs";
import { inferPorts } from "../module/lower/infer-ports";
import { currentSourceText } from "../module/source-text";
import type { Category, PortAnn } from "../types";
import { moduleFactory } from "./factory";
import { isHandle } from "./handle-data";
import type { Handle } from "./handle-data";
import { defineSubpatch } from "./subpatch/define-subpatch";

export interface DefpatchMeta {
	readonly doc?: string;
	readonly cat?: Category;
	readonly args?: readonly string[];
}

type PatchFn = (ins: Readonly<Record<string, Handle>>) => unknown;

export function defpatch(name: string, fn: PatchFn): (...args: unknown[]) => Handle;
export function defpatch(
	name: string,
	meta: DefpatchMeta,
	fn: PatchFn,
): (...args: unknown[]) => Handle;
export function defpatch(
	name: string,
	metaOrFn: DefpatchMeta | PatchFn,
	maybeFn?: PatchFn,
): (...args: unknown[]) => Handle {
	const [meta, fn] = maybeFn === undefined ? [{}, metaOrFn as PatchFn] : [metaOrFn as DefpatchMeta, maybeFn];
	const node = locateFn(name, fn);

	const ports = inferPorts(node, name);
	const outs = inferOuts(node, name);
	if (outs.outs.length === 0) {
		throw new Error(`defpatch('${name}'): the body must return a value`);
	}

	const outAnn: Record<string, PortAnn> = {};
	for (const key of outs.outs) outAnn[key] = { unit: "sig", def: 0 };

	const spec = defineSubpatch({
		name,
		...(meta.doc !== undefined ? { doc: meta.doc } : {}),
		category: meta.cat ?? "utils",
		ins: orderedIns(ports.ins, meta.args, name),
		outs: outAnn,
		patch: (ins: Readonly<Record<string, Handle>>) => wrapOut(fn(ins)),
	});
	return moduleFactory(spec);
}

/**
 * `fn`'s AST: when the current source text has `fn` written in it (a patch or
 * library file), find it there via `findSetup` (generalised to any callee
 * name) so a call among several `defpatch` calls resolves to the right one.
 * With no source text (a TS closure), parse `fn.toString()` alone — a patch
 * body needs no same-file helpers or origins, so either path is complete.
 */
function locateFn(name: string, fn: PatchFn): ArrowFunctionExpression {
	const fnText = fn.toString();
	const source = currentSourceText();
	if (source !== null) {
		const found = findSetup(fileProgram(source), source.text, fnText, "defpatch");
		if (found !== null) return asArrow(found.setup, name);
	}
	return asArrow(parseFunction(fnText, `defpatch '${name}'`).node, name);
}

/**
 * A sub-patch's positional order is its `ins` record's own key order
 * (subpatch/define-subpatch derives `positional` from it, taking no separate
 * field); `meta.args` reorders the inferred ports to match.
 */
function orderedIns(
	ins: Readonly<Record<string, PortAnn>>,
	args: readonly string[] | undefined,
	name: string,
): Record<string, PortAnn> {
	if (args === undefined) return { ...ins };
	const missing = args.find((port) => !(port in ins));
	if (missing !== undefined) {
		throw new Error(`defpatch('${name}'): meta.args names '${missing}', which is not an input`);
	}
	const extra = Object.keys(ins).find((port) => !args.includes(port));
	if (extra !== undefined) {
		throw new Error(`defpatch('${name}'): meta.args is missing input '${extra}'`);
	}
	const ordered: Record<string, PortAnn> = {};
	for (const port of args) ordered[port] = ins[port] as PortAnn;
	return ordered;
}

/**
 * `fn`'s result, as a sub-patch's `patch` must return it: a record of named
 * outputs (compile/subpatch/output-values). A bare value — a Handle, a
 * number, anything that is not already such a record — names the single
 * output `out`.
 */
function wrapOut(result: unknown): unknown {
	if (isHandle(result)) return { out: result };
	if (typeof result !== "object" || result === null) return { out: result };
	return result;
}

function asArrow(node: { type: string }, name: string): ArrowFunctionExpression {
	if (node.type !== "ArrowFunctionExpression") {
		throw new Error(`defpatch('${name}'): the patch body must be an arrow function, e.g. (i) => ...`);
	}
	return node as ArrowFunctionExpression;
}
