/**
 * A `hashRandom` key hashed as a number (bind-random.ts binds it to the
 * random library's `hashNumber`) must not hold a config value that is not a
 * number. Config is per node, so a config string cannot fold to its fnv1a32
 * hash when the module binds; hashing it as a number would silently change
 * its meaning. A key is suspect when it reads a config field whose declared
 * default is not a number, or a local set from one. A read that is compared
 * (`c.mode === "lp"`) or tested (`c.on ? 1 : 2`) gives a boolean, so it does
 * not count. Names are the front end's bindings (front/scope/), so a block's
 * own local never stands for another one of the same name.
 */

import type { AnyNode } from "acorn";
import type { FunctionIR } from "../front/module/module-ir";
import { walk } from "../front/parse/walk";
import { type Binding, type Scopes, bindingDeclaredBy, bindingOf } from "../front/scope/binding";
import { RANDOM_HELPER_PREFIX } from "./random-helpers";

const HASH_NUMBER = `${RANDOM_HELPER_PREFIX}hashNumber`;

const EQUALITY = new Set(["===", "!==", "==", "!="]);

/** Throws when a key the bound tick hashes as a number may read a config string. */
export function assertConfigKeys(
	tick: FunctionIR,
	config: Readonly<Record<string, unknown>>,
	what: string,
): void {
	const param = tick.scopes.params[3];
	if (param === undefined) return;
	const reader: Reader = { config: param, defaults: config, scopes: tick.scopes, locals: new Map() };
	taintLocals(tick, reader);
	walk(tick.node.body, (node) => {
		const key = numberKey(node, tick.scopes);
		if (key === null) return;
		const read = suspectRead(key, reader);
		if (read !== null) throw keyError(what, tick.text.slice(key.start, key.end), read);
	});
}

interface Reader {
	readonly config: Binding;
	readonly defaults: Readonly<Record<string, unknown>>;
	readonly scopes: Scopes;
	/** Local binding → the config read it was set from. */
	readonly locals: Map<Binding, string>;
}

/** The key of a bound `hashNumber(key, seed)` call, else null. */
function numberKey(node: AnyNode, scopes: Scopes): AnyNode | null {
	if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return null;
	if (node.callee.name !== HASH_NUMBER || scopes.references.get(node.callee)?.k !== "helper")
		return null;
	return node.arguments[0] ?? null;
}

/** Mark every local set from a suspect read, until no more change. */
function taintLocals(tick: FunctionIR, reader: Reader): void {
	for (let grew = true; grew; ) {
		grew = false;
		walk(tick.node.body, (node) => {
			const set = assigned(node, reader.scopes);
			if (set === null || reader.locals.has(set.binding)) return;
			const read = suspectRead(set.value, reader);
			if (read === null) return;
			reader.locals.set(set.binding, read);
			grew = true;
		});
	}
}

function assigned(node: AnyNode, scopes: Scopes): { binding: Binding; value: AnyNode } | null {
	if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init) {
		const binding = bindingDeclaredBy(scopes, node.id);
		return binding === undefined ? null : { binding, value: node.init };
	}
	if (node.type === "AssignmentExpression" && node.left.type === "Identifier") {
		const binding = bindingOf(scopes, node.left);
		return binding === undefined ? null : { binding, value: node.right };
	}
	return null;
}

function suspectRead(expression: AnyNode, reader: Reader): string | null {
	let found: string | null = null;
	walk(expression, (node, parent, key) => {
		if (found !== null || givesBoolean(parent, key)) return;
		if (node.type === "Identifier") {
			const binding = bindingOf(reader.scopes, node);
			const from = binding === undefined ? undefined : reader.locals.get(binding);
			if (from !== undefined) found = `local '${node.name}' (set from ${from})`;
			return;
		}
		if (node.type !== "MemberExpression" || node.object.type !== "Identifier") return;
		if (bindingOf(reader.scopes, node.object) !== reader.config) return;
		if (node.computed || node.property.type !== "Identifier") {
			found = "config by a computed name";
			return;
		}
		const field = node.property.name;
		if (typeof reader.defaults[field] !== "number") found = `config '${field}'`;
	});
	return found;
}

/** A value used only as a comparison operand or a test gives a boolean, never itself. */
function givesBoolean(parent: AnyNode | null, key: string | null): boolean {
	if (parent === null) return false;
	if (parent.type === "BinaryExpression") return EQUALITY.has(parent.operator);
	if (parent.type === "ConditionalExpression") return key === "test";
	if (parent.type === "UnaryExpression") return parent.operator === "!";
	return false;
}

function keyError(what: string, key: string, read: string): Error {
	return new Error(
		`${what}: hashRandom key \`${key}\` reads ${read}, which is not declared a number. Config is per node, so a config string cannot fold to its hash when the module binds; use a number key or a string literal`,
	);
}
