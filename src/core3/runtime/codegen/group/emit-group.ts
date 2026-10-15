/**
 * One group's function: the block loop over its nodes (pasted where the
 * group's size cap allows, call sites otherwise), reading other groups'
 * slots from their block regions and writing its own crossing slots to
 * theirs — the value before the block once, then each sample's value.
 * Signature: `(bufs, n, count, sr)`, with `n` at most BLOCK_MAX.
 */

import type { NodeRun } from "../../node-run";
import type { DriverScope } from "../driver-scope";
import { emitBlockLoop } from "../emit-block-loop";
import { emitCallNode } from "../emit-call-node";
import { slotLocal } from "../name-table";
import type { NodeCode } from "../node-code";
import type { Paster } from "../paste/paster";
import { valueSlots } from "../value-slots";
import type { BlockSlots } from "./block-slots";
import { groupAccess } from "./group-access";

export interface GroupEnv {
	readonly runs: readonly NodeRun[];
	readonly scope: DriverScope;
	readonly paster: Paster;
	readonly block: BlockSlots;
	/** Scope name of the block buffer. */
	readonly buffer: string;
}

export function emitGroup(
	name: string,
	members: readonly number[],
	pasted: ReadonlySet<number>,
	env: GroupEnv,
): string[] {
	const runs = members.map((i) => env.runs[i] as NodeRun);
	const slots = valueSlots(runs);
	const access = groupAccess(new Set(slots.all), env.block, env.buffer);
	const nodes: NodeCode[] = members.map(
		(i) =>
			(pasted.has(i) ? env.paster.paste(env.runs[i] as NodeRun, i, access) : null) ??
			emitCallNode(env.runs[i] as NodeRun, i, env.scope, access),
	);
	const crossing = slots.all.filter((s) => env.block.base.has(s));
	const region = (s: number) => env.block.base.get(s) as number;
	return [
		`function ${name}(bufs, n, count, sr) {`,
		...emitBlockLoop(
			slots,
			nodes,
			crossing.map((s) => `${env.buffer}[${region(s) + 1} + k] = ${slotLocal(s)};`),
			crossing.map((s) => `${env.buffer}[${region(s)}] = ${slotLocal(s)};`),
		),
		"}",
	];
}
