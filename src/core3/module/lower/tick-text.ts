/**
 * The tick's internal text: `(__dsp_s, __dsp_i, __dsp_o, __dsp_cfg, sr,
 * width) => { <body> }`, built from the author's tick by rewriting each
 * reference through its scope (`resolve-bindings`): a port local becomes
 * `__dsp_i.<port>`, a setup local `__dsp_s.<name>`, a setup config key
 * `__dsp_cfg.<name>`; `sr`/`width` (the setup's own params, closed over)
 * stay as written; a file numeric const is inlined as its literal text. A
 * tick local that shadows one of these is left alone — scope decides, not
 * name. `infer-outs.ts`'s return-rewriting edits are folded into the same
 * body `applyEdits` pass, since both touch disjoint spans.
 *
 * `resolveBindings` is OPAQUE on a nested function (a nested arrow lifts
 * later, in bind-sugar — lift-nested-arrows.ts — so its body still needs
 * this same rewrite before that lift ever sees it): a name read inside one
 * is invisible to the tick's own `resolveBindings` call, so it is
 * re-resolved with its OWN call, one per nested function found, recursively.
 * Only identifiers directly in a region (not inside a further-nested
 * function, which gets its own call) are rewritten against that region's
 * own scope.
 *
 * Edits never add or remove a newline: the param list — however many lines
 * its destructured pattern spans — is replaced by the internal param list,
 * padded with that many newlines, so every later line keeps its number.
 */

import type { AnyNode, ArrowFunctionExpression, Identifier } from "acorn";
import { eachChild } from "../front/parse/walk";
import { isReference } from "../front/scope/is-reference";
import { resolveBindings } from "../front/scope/resolve-bindings";
import type { Scopes } from "../front/scope/binding";
import { applyEdits, type TextEdit } from "../tick-build/text-edits";
import type { FileScope } from "./file-scope";
import type { InferredOuts } from "./infer-outs";
import type { InferredPorts } from "./infer-ports";

const NESTED_FUNCTION = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);

export function tickText(
	tick: ArrowFunctionExpression,
	fileText: string,
	ports: InferredPorts,
	outs: InferredOuts,
	setupLocals: ReadonlySet<string>,
	configKeys: ReadonlySet<string>,
	scope: FileScope,
	helperNames: ReadonlySet<string>,
	moduleName: string,
): string {
	const what = `module '${moduleName}'`;
	const portLocals = new Set(ports.bindings.values());

	const bodyEdits: TextEdit[] = [...outs.edits];

	/** `region`'s own children, recursively: an identifier is rewritten against `scopes` (the scope built for `region`'s own enclosing function); a nested function starts its own region, with its own `resolveBindings` call, so a name read inside it is resolved there instead (resolveBindings is OPAQUE on a nested function, so `scopes` has no entry for a reference strictly inside one). */
	const rewriteRegion = (node: AnyNode, parent: AnyNode | null, key: string | null, scopes: Scopes): void => {
		if (node.type === "Identifier" && isReference(parent, key)) {
			rewriteIdentifier(node as Identifier, parent, key, scopes, bodyEdits, {
				tick,
				outs,
				ports,
				portLocals,
				setupLocals,
				configKeys,
				scope,
				what,
				moduleName,
			});
			return;
		}
		if (NESTED_FUNCTION.has(node.type)) {
			const innerScopes = resolveBindings(node as never, helperNames);
			eachChild(node, (child, childKey) => rewriteRegion(child, node, childKey, innerScopes));
			return;
		}
		eachChild(node, (child, childKey) => rewriteRegion(child, node, childKey, scopes));
	};
	eachChild(tick.body as never, (child, childKey) =>
		rewriteRegion(child, tick.body as never, childKey, resolveBindings(tick as never, helperNames)),
	);

	const params = newParamListText(tick, fileText);
	const body = applyEdits(fileText.slice(tick.body.start, tick.body.end), shiftBy(bodyEdits, -tick.body.start));
	return `(${params}) => ${body}`;
}

interface RewriteCtx {
	readonly tick: ArrowFunctionExpression;
	readonly outs: InferredOuts;
	readonly ports: InferredPorts;
	readonly portLocals: ReadonlySet<string>;
	readonly setupLocals: ReadonlySet<string>;
	readonly configKeys: ReadonlySet<string>;
	readonly scope: FileScope;
	readonly what: string;
	readonly moduleName: string;
}

function rewriteIdentifier(
	id: Identifier,
	parent: AnyNode | null,
	key: string | null,
	scopes: Scopes,
	bodyEdits: TextEdit[],
	ctx: RewriteCtx,
): void {
	const resolution = scopes.references.get(id);
	if (resolution === undefined) return;

	if (resolution.k === "binding") {
		if (isOutParamUse(id, ctx.tick, ctx.outs.outParam)) {
			bodyEdits.push({ start: id.start, end: id.end, text: "__dsp_o" });
		}
		return; // any other tick-local binding (param or declared) is left as written
	}
	if (resolution.k !== "free") return; // helper/math/intrinsic/global: untouched

	const name = resolution.name;
	if (ctx.portLocals.has(name)) {
		assertNotWritten(id, parent, key, name, ctx.moduleName);
		bodyEdits.push({ start: id.start, end: id.end, text: `__dsp_i.${portNameFor(name, ctx.ports)}` });
		return;
	}
	if (ctx.setupLocals.has(name)) {
		bodyEdits.push({ start: id.start, end: id.end, text: `__dsp_s.${name}` });
		return;
	}
	if (ctx.configKeys.has(name)) {
		bodyEdits.push({ start: id.start, end: id.end, text: `__dsp_cfg.${name}` });
		return;
	}
	if (name === "sr" || name === "width") return; // the setup's own params, closed over
	const fileConst = ctx.scope.consts.get(name);
	if (fileConst !== undefined) {
		bodyEdits.push({ start: id.start, end: id.end, text: `(${fileConst.value})` });
		return;
	}
	throw new Error(`${ctx.what}: '${name}' is not a port, state, config, sr/width, a file const, or a known helper`);
}

/** Whether `id` is a reference to the tick's own second param (the output-group object). */
function isOutParamUse(id: Identifier, tick: ArrowFunctionExpression, outParam: string | null): boolean {
	if (outParam === null) return false;
	const second = tick.params[1];
	return second !== undefined && second.type === "Identifier" && second.name === outParam && id.name === outParam;
}

function portNameFor(local: string, ports: InferredPorts): string {
	for (const [port, binding] of ports.bindings) if (binding === local) return port;
	throw new Error(`tick-text: no port for local '${local}'`);
}

function assertNotWritten(
	id: Identifier,
	parent: unknown,
	key: string | null,
	portLocal: string,
	moduleName: string,
): void {
	const p = parent as { type?: string; left?: unknown; argument?: unknown } | null;
	if (p === null) return;
	const isAssignTarget = p.type === "AssignmentExpression" && p.left === id && key === "left";
	const isUpdateTarget = p.type === "UpdateExpression" && p.argument === id;
	if (isAssignTarget || isUpdateTarget) {
		throw new Error(
			`module '${moduleName}': the tick writes its port local '${portLocal}'; a port binding may not be ` +
				`assigned — if state needs this name too, rename the port binding, e.g. '${portLocal}: ${portLocal}0'`,
		);
	}
}

/** The internal param list, text-padded with as many newlines as the author's param list spanned. */
function newParamListText(tick: ArrowFunctionExpression, fileText: string): string {
	const internal = "__dsp_s, __dsp_i, __dsp_o, __dsp_cfg, sr, width";
	const first = tick.params[0];
	const last = tick.params[tick.params.length - 1];
	if (first === undefined || last === undefined) return internal;
	const original = fileText.slice(first.start, last.end);
	const newlines = countNewlines(original);
	return newlines === 0 ? internal : internal + "\n".repeat(newlines);
}

function countNewlines(text: string): number {
	let n = 0;
	for (let k = 0; k < text.length; k++) if (text.charCodeAt(k) === 10) n++;
	return n;
}

function shiftBy(edits: readonly TextEdit[], by: number): readonly TextEdit[] {
	return edits.map((edit) => ({ start: edit.start + by, end: edit.end + by, text: edit.text }));
}
