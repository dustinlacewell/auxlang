/**
 * Free names. A tick may name only its parameters, its locals, `Math`, its
 * helpers and `hashRandom` — nothing from the patch or the file around it, so
 * the text alone is the whole machine. `Math` must be read as `Math.name`;
 * helpers and `hashRandom` must be called.
 */

import type { AnyNode, Identifier } from "acorn";
import { type SubsetContext, isBound } from "./subset-context";

const CONSTANTS = new Set(["undefined", "NaN", "Infinity"]);

export function checkName(
	node: Identifier,
	parent: AnyNode | null,
	key: string | null,
	ctx: SubsetContext,
): void {
	if (!isReference(parent, key)) return;
	const name = node.name;
	if (isBound(ctx, name) || CONSTANTS.has(name)) return;
	if (name === "Math") {
		if (parent?.type === "MemberExpression" && key === "object" && !parent.computed) return;
		ctx.fail(node, "Math may only be used as Math.name");
	}
	if (ctx.helpers.has(name) || name === "hashRandom") {
		if (parent?.type === "CallExpression" && key === "callee") return;
		ctx.fail(node, `'${name}' may only be called`);
	}
	ctx.fail(
		node,
		`'${name}' is not defined here — a tick may use only its parameters, its locals, Math, its helpers and hashRandom (no closures over patch or module variables)`,
	);
}

/** Identifiers that are names, not references: property names, declared names, labels. */
function isReference(parent: AnyNode | null, key: string | null): boolean {
	if (parent === null) return true;
	if (parent.type === "MemberExpression" && key === "property") return parent.computed;
	if (parent.type === "VariableDeclarator" && key === "id") return false;
	if (key === "label") return false;
	return true;
}
