/**
 * The setup-local names a tick writes, scope-correct over the AUTHOR's text
 * (before rewriting): a local is written when it is assigned or updated
 * (`w = …`, `w++`, `w += …`), when it is the root identifier of an assigned
 * member target (`buf[w] = …`, `rec.x += …`), when it is passed as a call
 * argument (`fill(buf)`, which may mutate it through the callee), or when it
 * is aliased by a declaration (`const v = voices[0]`, `const e = v.env`) or a
 * `for...of` head (`for (const v of voices) ...`, read on the ORIGINAL AST
 * before bind-sugar lowers the loop — the head's name aliases an element the
 * same way `voices[0]` does), or the receiver of `.fill`/`.set`/`.copyWithin`
 * (`buf.fill(0)` writes `buf` the same way `buf[0] = 0` does) — from where a
 * write through the local reaches back into the field. `.forEach`'s callback
 * is read on the ORIGINAL AST too (bind-sugar lowers it to an index loop):
 * its first parameter aliases an element of the receiver, the same rule as a
 * `for...of` head, resolved separately (resolveBindings does not enter a
 * nested function) by arrayMethodWrites' own small walk over the callback
 * body alone. The tick's own `return` is its output, not an alias site (infer-outs.ts lowers
 * it to an output write, never an escaping reference), so it is not tracked
 * here. A declaration aliases a field only when the shape read through the access
 * chain can hold a reference (alias-shape.ts): a typed-array element or a
 * record's numeric property is a plain number, never an alias; `shapes`
 * gives each setup local's trial shape, read once from a real run of setup
 * (defineModule) — lowering itself has no state to run, so it calls this
 * with no shapes and the conservative fallback (unknown -> can alias) holds;
 * `defineModule` re-resolves with the real shapes once setup has run. A tick
 * local that shadows a setup local of the same name is not that local, so
 * does not count.
 */

import type {
	AnyNode,
	ArrayPattern,
	ArrowFunctionExpression,
	AssignmentExpression,
	AssignmentProperty,
	CallExpression,
	ForOfStatement,
	Identifier,
	MemberExpression,
	Pattern,
	UpdateExpression,
	VariableDeclarator,
} from "acorn";
import type { FunctionNode } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { bindingDeclaredBy, type Binding, type Scopes } from "../front/scope/binding";
import { resolveBindings } from "../front/scope/resolve-bindings";
import type { StateShape } from "../front/state/state-shape";
import { type AccessStep, shapeAtPath, shapeCanAlias } from "./alias-shape";

export function tickWrites(
	tick: ArrowFunctionExpression,
	setupLocals: ReadonlySet<string>,
	shapes: ReadonlyMap<string, StateShape> = new Map(),
): ReadonlySet<string> {
	const scopes = resolveBindings(tick as unknown as FunctionNode, new Set());
	const written = new Set<string>();
	/** Tick-local bindings known to alias a setup field, built forward over the walk. */
	const aliasOf = new Map<Binding, string>();

	const nameOf = (id: Identifier): string | null => {
		const resolution = scopes.references.get(id);
		if (resolution === undefined) return null;
		if (resolution.k === "free") return setupLocals.has(resolution.name) ? resolution.name : null;
		if (resolution.k === "binding") return aliasOf.get(resolution.binding) ?? null;
		return null;
	};

	/** The setup field `expr` reads from, through a chain of member accesses off an aliasing root. */
	const fieldReadBy = (expr: AnyNode): string | null => fieldReadAt(expr, []);

	/** The setup field `expr[…]` reads from: `expr`'s own chain, one more computed hop into an element. */
	const fieldReadAtElement = (expr: AnyNode): string | null => fieldReadAt(expr, [{ computed: true }]);

	function fieldReadAt(expr: AnyNode, extra: readonly AccessStep[]): string | null {
		const { root, path: own } = chainOf(expr);
		const path = extra.length === 0 ? own : [...own, ...extra];
		const field = root.type === "Identifier" ? nameOf(root as Identifier) : null;
		if (field === null) return null;
		if (path.length === 0) return field; // a bare alias local or setup field, not narrowed by access
		const fieldShape = shapes.get(field);
		const shape = fieldShape === undefined ? null : shapeAtPath(fieldShape, path);
		return shapeCanAlias(shape) ? field : null;
	}

	walk(tick.body as AnyNode, (node) => {
		assignmentTarget(node, nameOf, written);
		updateTarget(node, nameOf, written);
		callArguments(node, nameOf, written);
		aliasDeclarator(node, scopes, fieldReadAt, aliasOf);
		aliasForOfHead(node, scopes, fieldReadAtElement, aliasOf);
		arrayMethodWrites(node, nameOf, fieldReadAtElement, setupLocals, written);
	});

	return written;
}

function rootIdentifier(node: AnyNode): Identifier | null {
	let cur = node;
	while (cur.type === "MemberExpression") cur = (cur as { object: AnyNode }).object;
	return cur.type === "Identifier" ? (cur as Identifier) : null;
}

/** The root expression and the member-access path leading to `expr`, outermost access last. */
function chainOf(expr: AnyNode): { readonly root: AnyNode; readonly path: readonly AccessStep[] } {
	const path: AccessStep[] = [];
	let cur = expr;
	while (cur.type === "MemberExpression") {
		const member = cur as MemberExpression;
		path.unshift(
			member.computed ? { computed: true } : { computed: false, name: (member.property as Identifier).name },
		);
		cur = member.object as AnyNode;
	}
	return { root: cur, path };
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

/**
 * `const v = <expr>` records `v`'s binding as an alias of the field `<expr>`
 * reads through, when the read can be a reference — so a later write through
 * `v` (an assignment, an update, a further alias, a call argument) marks the
 * field written, same as writing through the field's own name would. `const
 * { env } = voice` (lift-destructuring's own kind of declaration, bind-sugar
 * lowers it before the tick subset ever sees it, so this runs on the
 * original pattern) is the same rule applied once per binding the pattern
 * names, each reading `<expr>`'s chain plus one more access step per level
 * of pattern nesting (bindPatternAliases).
 */
function aliasDeclarator(
	node: AnyNode,
	scopes: Scopes,
	fieldReadAt: (expr: AnyNode, extra: readonly AccessStep[]) => string | null,
	aliasOf: Map<Binding, string>,
): void {
	if (node.type !== "VariableDeclarator") return;
	const decl = node as VariableDeclarator;
	if (decl.init === null || decl.init === undefined) return;
	bindPatternAliases(decl.id as Pattern, decl.init as AnyNode, [], scopes, fieldReadAt, aliasOf);
}

/**
 * `pattern` destructures `source` through `extra`, the access steps already
 * taken to reach this level of nesting: each binding the pattern names
 * aliases the field `source` reads through at `extra` plus its own one more
 * step into the property or element it reads. A default (`c = 1`) carries
 * no extra step of its own. A rest element allocates and is refused at
 * bind-sugar, so lowered code never carries one — a raw author's tick that
 * reaches this unlowered simply skips it (no step to add, nothing to alias).
 */
function bindPatternAliases(
	pattern: Pattern,
	source: AnyNode,
	extra: readonly AccessStep[],
	scopes: Scopes,
	fieldReadAt: (expr: AnyNode, extra: readonly AccessStep[]) => string | null,
	aliasOf: Map<Binding, string>,
): void {
	if (pattern.type === "Identifier") {
		const field = fieldReadAt(source, extra);
		if (field === null) return;
		const binding = bindingDeclaredBy(scopes, pattern as Identifier);
		if (binding !== undefined) aliasOf.set(binding, field);
		return;
	}
	if (pattern.type === "AssignmentPattern") {
		bindPatternAliases(pattern.left as Pattern, source, extra, scopes, fieldReadAt, aliasOf);
		return;
	}
	if (pattern.type === "ObjectPattern") {
		for (const prop of pattern.properties) {
			if (prop.type === "RestElement") continue;
			const property = prop as AssignmentProperty;
			if (property.key.type !== "Identifier" || property.computed) continue;
			bindPatternAliases(
				property.value as Pattern,
				source,
				[...extra, { computed: false, name: property.key.name }],
				scopes,
				fieldReadAt,
				aliasOf,
			);
		}
		return;
	}
	if (pattern.type === "ArrayPattern") {
		for (const el of (pattern as ArrayPattern).elements) {
			if (el === null || el.type === "RestElement") continue;
			bindPatternAliases(el as Pattern, source, [...extra, { computed: true }], scopes, fieldReadAt, aliasOf);
		}
	}
}

/**
 * `for (const v of voices) ...`: `v` aliases an element of `voices`, the same
 * way `const v = voices[0]` does — a later write through `v` marks `voices`
 * written. Bind-sugar lowers the loop to an index loop before the tick
 * subset ever sees it, so this runs on the original `ForOfStatement`.
 */
function aliasForOfHead(
	node: AnyNode,
	scopes: Scopes,
	fieldReadAtElement: (expr: AnyNode) => string | null,
	aliasOf: Map<Binding, string>,
): void {
	if (node.type !== "ForOfStatement") return;
	const left = (node as ForOfStatement).left;
	if (left.type !== "VariableDeclaration" || left.declarations.length !== 1) return;
	const id = left.declarations[0]?.id;
	if (id === undefined || id.type !== "Identifier") return;
	const field = fieldReadAtElement((node as ForOfStatement).right as unknown as AnyNode);
	if (field === null) return;
	const binding = bindingDeclaredBy(scopes, id as Identifier);
	if (binding !== undefined) aliasOf.set(binding, field);
}

/**
 * `buf.fill(...)` / `buf.set(...)` / `buf.copyWithin(...)` write `buf` the
 * same way an element assignment does; `buf.forEach(cb)` writes `buf` only
 * when a write inside `cb`'s body reaches back into the element its first
 * parameter aliases (forEachCallbackWrites). Bind-sugar lowers every one of
 * these to an index loop before the tick subset ever sees it, so this runs
 * on the original `CallExpression`.
 */
function arrayMethodWrites(
	node: AnyNode,
	nameOf: (id: Identifier) => string | null,
	fieldReadAtElement: (expr: AnyNode) => string | null,
	setupLocals: ReadonlySet<string>,
	written: Set<string>,
): void {
	if (node.type !== "CallExpression") return;
	const call = node as CallExpression;
	const callee = call.callee;
	if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
	const method = callee.property.name;
	const root = rootIdentifier(callee.object as unknown as AnyNode);
	if (root === null) return;
	if (method === "fill" || method === "set" || method === "copyWithin") {
		const name = nameOf(root);
		if (name !== null) written.add(name);
		return;
	}
	if (method !== "forEach") return;
	const callback = call.arguments[0];
	if (callback === undefined || callback.type !== "ArrowFunctionExpression") return;
	const param = callback.params[0];
	if (param === undefined || param.type !== "Identifier") return;
	const field = fieldReadAtElement(callee.object as unknown as AnyNode);
	forEachCallbackWrites(callback, param.name, field, setupLocals, written);
}

/** Every setup local `callback`'s body writes directly, plus `field` (through `elementParam`, when `field` is not null) when the body writes through the alias — same rule as `aliasForOfHead`, resolved by name alone: `resolveBindings` does not enter a nested function, so this is its own small walk, scoped to the callback alone. */
function forEachCallbackWrites(
	callback: ArrowFunctionExpression,
	elementParam: string,
	field: string | null,
	setupLocals: ReadonlySet<string>,
	written: Set<string>,
): void {
	const nameOf = (id: Identifier): string | null => {
		if (id.name === elementParam) return field;
		return setupLocals.has(id.name) ? id.name : null;
	};
	walk(callback.body as AnyNode, (node) => {
		assignmentTarget(node, nameOf, written);
		updateTarget(node, nameOf, written);
		callArguments(node, nameOf, written);
	});
}
