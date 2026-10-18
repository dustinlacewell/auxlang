/**
 * The code the rewrite must leave byte-identical: functions whose text is
 * read back as source. A signal lambda, a tick, its helpers and its state are
 * stringified (checked against the tick subset, shipped to the worklet,
 * hashed into the module kind), so a trace call inserted there would change
 * the program. Three rules find them:
 *
 *  - every argument of a `defmod(...)` call (also `defineInternalModule(...)`,
 *    the test-only entry an evalPatch extraScope may bind to the same
 *    object-spec shape — module/define-internal-module), and the
 *    declarations its spec names by identifier (`defmod(spec)`, `{ tick }`,
 *    `helpers: { fold }`);
 *  - a `defpatch(...)` call's last argument's PARAM LIST only (not its body,
 *    which is ordinary patch code and stays traced): `fn.toString()` is read
 *    back for port inference (patch/defpatch), so a trace wrapper inserted in
 *    a param default (e.g. `cutoff = hz(84)`) would change what that read
 *    back text parses to;
 *  - every function that cannot build a module: no method call other than
 *    `Math.*`, no tagged template, no call to a user-scope name. Every tick
 *    and lambda inside the subset is such a function.
 */

import type { AnyNode, ArrowFunctionExpression, CallExpression, FunctionExpression } from "acorn";
import { walk } from "../../module/front/parse/walk";
import type { SourceRange } from "../range";
import { isMathMember } from "./is-math-member";

export function protectedSpans(program: AnyNode, scope: ReadonlySet<string>): SourceRange[] {
	const found = survey(program, scope);
	return [...inertFunctions(found), ...defmodSpans(found), ...defpatchSpans(found)];
}

interface Survey {
	readonly functions: AnyNode[];
	readonly builderCalls: AnyNode[];
	readonly defmods: CallExpression[];
	readonly defpatches: CallExpression[];
	readonly declarations: Map<string, AnyNode[]>;
}

function survey(program: AnyNode, scope: ReadonlySet<string>): Survey {
	const found: Survey = {
		functions: [],
		builderCalls: [],
		defmods: [],
		defpatches: [],
		declarations: new Map(),
	};
	walk(program, (node) => {
		if (isFunction(node)) found.functions.push(node);
		if (isBuilderCall(node, scope)) found.builderCalls.push(node);
		if (node.type === "CallExpression" && (calleeIs(node, "defmod") || calleeIs(node, "defineInternalModule")))
			found.defmods.push(node);
		if (node.type === "CallExpression" && calleeIs(node, "defpatch")) found.defpatches.push(node);
		const declared = declaration(node);
		if (declared !== null) {
			const list = found.declarations.get(declared.name) ?? [];
			list.push(declared.span);
			found.declarations.set(declared.name, list);
		}
	});
	return found;
}

function inertFunctions(found: Survey): SourceRange[] {
	return found.functions
		.filter((fn) => !found.builderCalls.some((call) => within(call, fn)))
		.map(spanOf);
}

function defmodSpans(found: Survey): SourceRange[] {
	const spans: SourceRange[] = [];
	for (const call of found.defmods) {
		for (const arg of call.arguments) {
			spans.push(spanOf(arg));
			for (const name of namedIdentifiers(arg)) {
				for (const decl of found.declarations.get(name) ?? []) spans.push(spanOf(decl));
			}
		}
	}
	return spans;
}

/** A `defpatch(...)` call's last argument, when a function: its param list only. */
function defpatchSpans(found: Survey): SourceRange[] {
	const spans: SourceRange[] = [];
	for (const call of found.defpatches) {
		const last = call.arguments[call.arguments.length - 1];
		if (last === undefined || !isFunction(last)) continue;
		const fn = last as ArrowFunctionExpression | FunctionExpression;
		if (fn.params.length === 0) continue;
		const first = fn.params[0] as AnyNode;
		const end = fn.params[fn.params.length - 1] as AnyNode;
		spans.push({ start: first.start, end: end.end });
	}
	return spans;
}

/** A call that may build a module, so a function containing it is not a tick. */
function isBuilderCall(node: AnyNode, scope: ReadonlySet<string>): boolean {
	if (node.type === "TaggedTemplateExpression") return true;
	if (node.type !== "CallExpression") return false;
	const callee = node.callee;
	if (callee.type === "Identifier") return scope.has(callee.name);
	if (callee.type === "MemberExpression") return !isMathMember(callee);
	return true;
}

/** Identifiers a defmod spec refers to: the spec itself, or values in its object literal tree. */
function namedIdentifiers(node: AnyNode): string[] {
	if (node.type === "Identifier") return [node.name];
	if (node.type !== "ObjectExpression") return [];
	return node.properties.flatMap((prop) =>
		prop.type === "Property" ? namedIdentifiers(prop.value) : [],
	);
}

function declaration(node: AnyNode): { name: string; span: AnyNode } | null {
	if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init) {
		return { name: node.id.name, span: node.init };
	}
	if (node.type === "FunctionDeclaration" && node.id) return { name: node.id.name, span: node };
	return null;
}

function isFunction(node: AnyNode): boolean {
	return (
		node.type === "ArrowFunctionExpression" ||
		node.type === "FunctionExpression" ||
		node.type === "FunctionDeclaration"
	);
}

function calleeIs(node: CallExpression, name: string): boolean {
	return node.callee.type === "Identifier" && node.callee.name === name;
}

function within(inner: AnyNode, outer: AnyNode): boolean {
	return inner.start >= outer.start && inner.end <= outer.end;
}

function spanOf(node: AnyNode): SourceRange {
	return { start: node.start, end: node.end };
}
