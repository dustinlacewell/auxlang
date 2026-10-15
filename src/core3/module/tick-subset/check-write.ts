/**
 * Writes. A tick writes its locals, its declared outputs, and fields its
 * fresh state already has — never a new field, never an array's length, never
 * its inputs or config. Field writes go through the state parameter by name,
 * so their path can be checked against the real fresh state; elsewhere only
 * indexed writes (`buf[k] = x`) are allowed.
 */

import type { AnyNode, MemberExpression } from "acorn";
import { type SubsetContext, isBound } from "./subset-context";

interface Hop {
	readonly computed: boolean;
	readonly name: string | null;
}

export function checkWrite(target: AnyNode, ctx: SubsetContext): void {
	if (target.type === "Identifier") {
		if (!isBound(ctx, target.name))
			ctx.fail(target, `assigns to '${target.name}', which is not a local`);
		return;
	}
	if (target.type !== "MemberExpression")
		ctx.fail(target, "only locals and fields can be assigned");
	const { root, hops } = unwind(target as MemberExpression);
	if (root.type !== "Identifier") ctx.fail(target, "only locals and fields can be assigned");
	const owner = root.type === "Identifier" ? root.name : "";
	if (hops.some((h) => !h.computed && h.name === "length"))
		ctx.fail(target, "writing .length resizes an array — array sizes are fixed at start");
	if (owner === ctx.roles.state) checkStatePath(target, hops, ctx);
	else if (owner === ctx.roles.outs) checkOutput(target, hops, ctx);
	else if (owner === ctx.roles.ins || owner === ctx.roles.config)
		ctx.fail(target, "inputs and config are read-only");
	else if (hops.some((h) => !h.computed))
		ctx.fail(
			target,
			`writes a field through '${owner}' — write state fields through the state parameter so their shape can be checked`,
		);
}

function unwind(target: MemberExpression): { root: AnyNode; hops: Hop[] } {
	const hops: Hop[] = [];
	let node: AnyNode = target;
	while (node.type === "MemberExpression") {
		const name = !node.computed && node.property.type === "Identifier" ? node.property.name : null;
		hops.unshift({ computed: node.computed, name });
		node = node.object;
	}
	return { root: node, hops };
}

/** Walk the path through the fresh state: every named hop must already exist. */
function checkStatePath(target: AnyNode, hops: readonly Hop[], ctx: SubsetContext): void {
	let current: unknown = ctx.state;
	let path = ctx.roles.state ?? "s";
	for (const hop of hops) {
		if (current === undefined) return;
		if (hop.computed) {
			if (Array.isArray(current)) current = current[0];
			else if (ArrayBuffer.isView(current)) current = undefined;
			else ctx.fail(target, `'${path}' is not an array — state fields must be named, not computed`);
			path += "[…]";
			continue;
		}
		path += `.${hop.name}`;
		if (!isRecord(current) || !(String(hop.name) in current))
			ctx.fail(
				target,
				`adds field '${path}' — state shape is fixed at start; declare it in state()`,
			);
		current = (current as Record<string, unknown>)[String(hop.name)];
	}
}

function checkOutput(target: AnyNode, hops: readonly Hop[], ctx: SubsetContext): void {
	const hop = hops[0];
	if (hops.length !== 1 || hop === undefined || hop.computed)
		ctx.fail(target, "write outputs by name (o.out)");
	if (hop !== undefined && !ctx.outs.has(String(hop.name)))
		ctx.fail(target, `unknown output '${hop.name}' (outputs: ${[...ctx.outs].join(", ")})`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		!ArrayBuffer.isView(value)
	);
}
