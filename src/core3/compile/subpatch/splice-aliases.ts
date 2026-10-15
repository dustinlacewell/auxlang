/**
 * Splicing expanded sub-patches into the graph. An alias is a node that does
 * not exist at run time: a sub-patch instance (each output port stands for an
 * inner value) or a stand-in (its `out` stands for an input value). Every
 * reference to an alias, in an input, a `.mod` term or a z-edge, is replaced
 * by the value it stands for, followed through further aliases. The walk
 * starts at the roots and follows the replaced references, so it reaches the
 * inner graphs it splices in.
 *
 * A lane picked from an alias carries onto its value. A chain of aliases that
 * returns to itself is a cycle with no unit delay, a loud error.
 */

import { isNodeRef, isZRef } from "../../graph/input-kinds";
import type { GNode, InputValue, ModTerm, NodeRef } from "../../graph/node";

export type Aliases = ReadonlyMap<GNode, Readonly<Record<string, InputValue>>>;

export function spliceAliases(roots: readonly GNode[], aliases: Aliases): void {
	const seen = new Set<GNode>();
	const pending = [...roots];
	for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
		if (seen.has(node)) continue;
		seen.add(node);
		for (const [port, value] of Object.entries(node.inputs)) {
			node.inputs[port] = resolve(value, aliases);
		}
		if (node.mods !== undefined) node.mods = resolvedMods(node.mods, aliases);
		pending.push(...sources(node));
	}
}

function resolvedMods(
	mods: Readonly<Record<string, readonly ModTerm[]>>,
	aliases: Aliases,
): Record<string, readonly ModTerm[]> {
	const out: Record<string, readonly ModTerm[]> = {};
	for (const [port, terms] of Object.entries(mods)) {
		out[port] = terms.map((t) => ({
			signal: resolve(t.signal, aliases),
			depth: resolve(t.depth, aliases),
		}));
	}
	return out;
}

function resolve(value: InputValue, aliases: Aliases): InputValue {
	if (isNodeRef(value)) return resolveRef(value, aliases, new Set());
	if (isZRef(value) && aliases.has(value.z.node)) return resolveZ(value.z, aliases);
	return value;
}

function resolveRef(ref: NodeRef, aliases: Aliases, trail: Set<GNode>): InputValue {
	const alias = aliases.get(ref.node);
	if (alias === undefined) return ref;
	if (trail.has(ref.node)) {
		throw new Error(
			`cycle without a unit delay through sub-patch '${ref.node.module}'. Close it with loop().`,
		);
	}
	trail.add(ref.node);
	const target = alias[ref.port];
	if (target === undefined) {
		throw new Error(`${ref.node.module}.${ref.port}: no such output (internal error)`);
	}
	const picked = withLane(target, ref.lane, ref.node.module);
	return isNodeRef(picked) ? resolveRef(picked, aliases, trail) : picked;
}

/** A z-edge into an alias reads the value it stands for, one sample late. */
function resolveZ(
	z: { readonly node: GNode; readonly port: string },
	aliases: Aliases,
): InputValue {
	const target = resolveRef({ node: z.node, port: z.port }, aliases, new Set());
	if (!isNodeRef(target)) return target;
	if (target.lane !== undefined) {
		throw new Error(
			`loop(): the fed-back output of sub-patch '${z.node.module}' is a single lane. Feed back the whole signal.`,
		);
	}
	return { z: { node: target.node, port: target.port } };
}

function withLane(target: InputValue, lane: number | undefined, module: string): InputValue {
	if (lane === undefined || !isNodeRef(target)) return target;
	if (target.lane !== undefined && target.lane !== lane) {
		throw new Error(
			`${module}.lane(${lane}): this sub-patch output is already lane ${target.lane} of its source`,
		);
	}
	return { ...target, lane };
}

function sources(node: GNode): GNode[] {
	const terms = Object.values(node.mods ?? {}).flat();
	const values = [...Object.values(node.inputs), ...terms.flatMap((t) => [t.signal, t.depth])];
	const found: GNode[] = [];
	for (const value of values) {
		if (isNodeRef(value)) found.push(value.node);
		else if (isZRef(value)) found.push(value.z.node);
	}
	return found;
}
