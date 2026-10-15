/**
 * The code the rewrite must leave byte-identical: functions whose text is
 * read back as source. A signal lambda, a tick, its helpers and its state are
 * stringified (checked against the tick subset, shipped to the worklet,
 * hashed into the module kind), so a trace call inserted there would change
 * the program. Two rules find them:
 *
 *  - every argument of a `defmod(...)` call, and the declarations its spec
 *    names by identifier (`defmod(spec)`, `{ tick }`, `helpers: { fold }`);
 *  - every function that cannot build a module: no method call other than
 *    `Math.*`, no tagged template, no call to a user-scope name. Every tick
 *    and lambda inside the subset is such a function.
 */

import type { AnyNode, CallExpression } from "acorn";
import { walk } from "../../module/tick-subset/walk";
import type { SourceRange } from "../range";
import { isMathMember } from "./is-math-member";

export function protectedSpans(program: AnyNode, scope: ReadonlySet<string>): SourceRange[] {
	const found = survey(program, scope);
	return [...inertFunctions(found), ...defmodSpans(found)];
}

interface Survey {
	readonly functions: AnyNode[];
	readonly builderCalls: AnyNode[];
	readonly defmods: CallExpression[];
	readonly declarations: Map<string, AnyNode[]>;
}

function survey(program: AnyNode, scope: ReadonlySet<string>): Survey {
	const found: Survey = { functions: [], builderCalls: [], defmods: [], declarations: new Map() };
	walk(program, (node) => {
		if (isFunction(node)) found.functions.push(node);
		if (isBuilderCall(node, scope)) found.builderCalls.push(node);
		if (node.type === "CallExpression" && calleeIs(node, "defmod")) found.defmods.push(node);
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
