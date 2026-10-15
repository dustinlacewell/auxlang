/**
 * A table intrinsic call (table-intrinsics.ts): only in the tick of a module
 * that declares `reads: "pattern"`, with its state and config parameters
 * named (the bindings read the lane's table and the pattern through them),
 * with the right argument count, and `__tableRow`'s field a string literal
 * naming a row field.
 */

import type { AnyNode, CallExpression, Literal } from "acorn";
import type { SubsetContext } from "./subset-context";
import { TABLE_INTRINSICS, TABLE_ROW_FIELDS, isTableRowField } from "./table-intrinsics";

export function checkTableCall(node: CallExpression, name: string, ctx: SubsetContext): void {
	if (!ctx.tables)
		ctx.fail(node, `${name}() is available only to a module that declares reads: "pattern"`);
	if (ctx.kind !== "tick")
		ctx.fail(node, `${name}() is available only in tick, which owns the lane's table`);
	if (ctx.roles.state === undefined || ctx.roles.config === undefined)
		ctx.fail(node, `${name}() needs the tick's state and config parameters to be named`);
	const arity = TABLE_INTRINSICS.get(name) as number;
	if (node.arguments.length !== arity)
		ctx.fail(node, `${name} takes ${arity === 0 ? "no arguments" : `${arity} argument(s)`}`);
	if (name === "__tableRow") checkRowField(node, ctx);
}

function checkRowField(node: CallExpression, ctx: SubsetContext): void {
	const field = node.arguments[0];
	if (field?.type !== "Literal" || !isTableRowField(field.value))
		ctx.fail(
			node,
			`__tableRow's first argument must be a row field name: ${TABLE_ROW_FIELDS.map((f) => `"${f}"`).join(", ")}`,
		);
}

/** Whether `literal` is the field argument of a `__tableRow` call (the call itself checks the field). */
export function isRowFieldLiteral(literal: Literal, parent: AnyNode | null): boolean {
	return (
		parent?.type === "CallExpression" &&
		parent.callee.type === "Identifier" &&
		parent.callee.name === "__tableRow" &&
		parent.arguments[0] === literal
	);
}
