/**
 * Whether a `hashRandom` key may hold a config value that is not a number.
 * Config is per node, so a config string cannot fold to its fnv1a32 hash
 * when the module binds; hashing it as a number would silently change its
 * meaning. A key is suspect when it reads a config field whose declared
 * default is not a number, or a local set from one. A read that is compared
 * (`c.mode === "lp"`) or tested (`c.on ? 1 : 2`) gives a boolean, so it
 * does not count.
 */

import type { AnyNode } from "acorn";
import type { FunctionNode } from "../tick-subset/parse-function";
import { walk } from "../tick-subset/walk";

const EQUALITY = new Set(["===", "!==", "==", "!="]);

/** For a tick and its declared config, a check: the suspect read in a key, or null. */
export function configKeyCheck(
	tick: FunctionNode,
	config: Readonly<Record<string, unknown>>,
): (key: AnyNode) => string | null {
	const param = tick.params[3];
	if (param === undefined || param.type !== "Identifier") return () => null;
	const reader = { config: param.name, defaults: config, locals: new Map<string, string>() };
	taintLocals(tick, reader);
	return (key) => suspectRead(key, reader);
}

interface Reader {
	readonly config: string;
	readonly defaults: Readonly<Record<string, unknown>>;
	/** Local name → the config read it was set from. */
	readonly locals: Map<string, string>;
}

/** Mark every local set from a suspect read, until no more change. */
function taintLocals(tick: FunctionNode, reader: Reader): void {
	for (let grew = true; grew; ) {
		grew = false;
		walk(tick.body, (node) => {
			const set = assigned(node);
			if (set === null || reader.locals.has(set.name)) return;
			const read = suspectRead(set.value, reader);
			if (read === null) return;
			reader.locals.set(set.name, read);
			grew = true;
		});
	}
}

function assigned(node: AnyNode): { name: string; value: AnyNode } | null {
	if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init)
		return { name: node.id.name, value: node.init };
	if (node.type === "AssignmentExpression" && node.left.type === "Identifier")
		return { name: node.left.name, value: node.right };
	return null;
}

function suspectRead(expression: AnyNode, reader: Reader): string | null {
	let found: string | null = null;
	walk(expression, (node, parent, key) => {
		if (found !== null || givesBoolean(parent, key)) return;
		if (node.type === "Identifier" && key !== "property") {
			const from = reader.locals.get(node.name);
			if (from !== undefined) found = `local '${node.name}' (set from ${from})`;
			return;
		}
		if (node.type !== "MemberExpression" || node.object.type !== "Identifier") return;
		if (node.object.name !== reader.config) return;
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
