/**
 * Writes. A tick writes its locals, its declared outputs, and fields its
 * fresh state already has — never a new field, never an array's length, never
 * its inputs or config, never a role parameter itself (`s = 0`: only one
 * state, inputs, outputs and config record exists). A write through the state
 * record (or a variable holding it, module/roles.ts) has its path checked
 * against the real fresh state here; a write through any other record or
 * array is checked against its type by the plan (front/types/).
 */

import type { AnyNode, MemberExpression } from "acorn";
import { type Role, type RuleContext, resolutionOf, roleOf } from "./rule-context";

const ROLE_NAMES: Readonly<Record<Role, string>> = {
	state: "state record",
	ins: "inputs record",
	outs: "outputs record",
	config: "config record",
};

interface Hop {
	readonly computed: boolean;
	readonly name: string | null;
}

export function checkWrite(target: AnyNode, ctx: RuleContext): void {
	if (target.type === "Identifier") {
		if (resolutionOf(ctx, target)?.k !== "binding")
			ctx.fail(target, `assigns to '${target.name}', which is not a local`);
		const role = roleOf(ctx, target);
		if (role !== undefined)
			ctx.fail(target, `assigns to '${target.name}', the tick's ${ROLE_NAMES[role]} — write its fields instead`);
		return;
	}
	if (target.type !== "MemberExpression")
		ctx.fail(target, "only locals and fields can be assigned");
	const { root, hops } = unwind(target as MemberExpression);
	if (root.type !== "Identifier") ctx.fail(target, "only locals and fields can be assigned");
	const owner = root.type === "Identifier" ? root.name : "";
	if (hops.some((h) => !h.computed && h.name === "length"))
		ctx.fail(target, "writing .length resizes an array — array sizes are fixed at start");
	const role = roleOf(ctx, root);
	if (role === "state") checkStatePath(target, owner, hops, ctx);
	else if (role === "outs") checkOutput(target, hops, ctx);
	else if (role === "ins" || role === "config")
		ctx.fail(target, "inputs and config are read-only");
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
function checkStatePath(
	target: AnyNode,
	owner: string,
	hops: readonly Hop[],
	ctx: RuleContext,
): void {
	let current: unknown = ctx.state;
	let path = owner;
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

function checkOutput(target: AnyNode, hops: readonly Hop[], ctx: RuleContext): void {
	const hop = hops[0];
	const isGroup = hop !== undefined && !hop.computed && hop.name !== null && ctx.outGroups.has(hop.name);
	if (isGroup) {
		const indexHop = hops[1];
		if (hops.length === 2 && indexHop?.computed === true) return;
		ctx.fail(target, `write a group's members by index (o.${hop?.name}[k])`);
		return;
	}
	if (hops.length !== 1 || hop === undefined || hop.computed) {
		ctx.fail(target, "write outputs by name (o.out)");
		return;
	}
	if (!ctx.outs.has(String(hop.name)))
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
