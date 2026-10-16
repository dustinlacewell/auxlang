/**
 * The setup-local names a tick writes, scope-correct over the AUTHOR's text
 * (before rewriting): a local is written when it is assigned or updated
 * (`w = …`, `w++`, `w += …`), when it is the root identifier of an assigned
 * member target (`buf[w] = …`, `rec.x += …`), when it is passed as a call
 * argument (`fill(buf)`, which may mutate it through the callee), or when it
 * is aliased — put in a declaration, a `return`, or an array/object literal,
 * from where another reference could escape with it. A tick local that
 * shadows a setup local of the same name is not that local, so does not
 * count.
 */

import type {
	AnyNode,
	ArrayExpression,
	ArrowFunctionExpression,
	AssignmentExpression,
	CallExpression,
	Identifier,
	ObjectExpression,
	Property,
	ReturnStatement,
	UpdateExpression,
	VariableDeclarator,
} from "acorn";
import type { FunctionNode } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { resolveBindings } from "../front/scope/resolve-bindings";

export function tickWrites(tick: ArrowFunctionExpression, setupLocals: ReadonlySet<string>): ReadonlySet<string> {
	const scopes = resolveBindings(tick as unknown as FunctionNode, new Set());
	const written = new Set<string>();

	const nameOf = (id: Identifier): string | null => {
		const resolution = scopes.references.get(id);
		if (resolution === undefined || resolution.k !== "free") return null;
		return setupLocals.has(resolution.name) ? resolution.name : null;
	};

	walk(tick.body as AnyNode, (node) => {
		assignmentTarget(node, nameOf, written);
		updateTarget(node, nameOf, written);
		callArguments(node, nameOf, written);
		aliasSites(node, nameOf, written);
	});

	return written;
}

function rootIdentifier(node: AnyNode): Identifier | null {
	let cur = node;
	while (cur.type === "MemberExpression") cur = (cur as { object: AnyNode }).object;
	return cur.type === "Identifier" ? (cur as Identifier) : null;
}

function assignmentTarget(
	node: AnyNode,
	nameOf: (id: Identifier) => string | null,
	written: Set<string>,
): void {
	if (node.type !== "AssignmentExpression") return;
	const target = (node as AssignmentExpression).left;
	const root = rootIdentifier(target as unknown as AnyNode);
	if (root === null) return;
	const name = nameOf(root);
	if (name !== null) written.add(name);
}

function updateTarget(node: AnyNode, nameOf: (id: Identifier) => string | null, written: Set<string>): void {
	if (node.type !== "UpdateExpression") return;
	const root = rootIdentifier((node as UpdateExpression).argument as unknown as AnyNode);
	if (root === null) return;
	const name = nameOf(root);
	if (name !== null) written.add(name);
}

function callArguments(node: AnyNode, nameOf: (id: Identifier) => string | null, written: Set<string>): void {
	if (node.type !== "CallExpression") return;
	for (const arg of (node as CallExpression).arguments) {
		if (arg.type !== "Identifier") continue;
		const name = nameOf(arg as Identifier);
		if (name !== null) written.add(name);
	}
}

/** A local put in a declaration init, a `return`, or an array/object literal may escape with another reference to it. */
function aliasSites(node: AnyNode, nameOf: (id: Identifier) => string | null, written: Set<string>): void {
	if (node.type === "VariableDeclarator") {
		const init = (node as VariableDeclarator).init;
		if (init?.type === "Identifier") {
			const name = nameOf(init as Identifier);
			if (name !== null) written.add(name);
		}
		return;
	}
	if (node.type === "ReturnStatement") {
		const arg = (node as ReturnStatement).argument;
		if (arg?.type === "Identifier") {
			const name = nameOf(arg as Identifier);
			if (name !== null) written.add(name);
		}
		return;
	}
	if (node.type === "ArrayExpression") {
		for (const el of (node as ArrayExpression).elements) {
			if (el?.type === "Identifier") {
				const name = nameOf(el as Identifier);
				if (name !== null) written.add(name);
			}
		}
		return;
	}
	if (node.type === "ObjectExpression") {
		for (const prop of (node as ObjectExpression).properties) {
			if (prop.type !== "Property") continue;
			const value = (prop as Property).value;
			if (value.type === "Identifier") {
				const name = nameOf(value as Identifier);
				if (name !== null) written.add(name);
			}
		}
	}
}
