/**
 * A node at a call site (phase 1's form): per lane, gathers into the node's
 * reused ins record, one static call of the module's tick, and the scatter
 * from its outs record. Exempt modules and any tick that cannot be pasted run
 * this way. All its state stays in the objects, so it needs no code before
 * or after the sample loop.
 */

import type { LaneBindings } from "../bindings";
import type { ReduceGathers } from "../gathers";
import type { NodeRun } from "../node-run";
import type { DriverScope } from "./driver-scope";
import { emitLaneGathers } from "./emit-lane-gathers";
import { emitReduceGathers } from "./emit-reduce-gathers";
import { emitScatter } from "./emit-scatter";
import { type NodeNames, emitMapTickCall, emitReduceTickCall } from "./emit-tick-call";
import { propKey } from "./js-literal";
import type { NodeCode } from "./node-code";
import type { SlotAccess } from "./slot-access";

export function emitCallNode(
	run: NodeRun,
	i: number,
	scope: DriverScope,
	slots: SlotAccess,
): NodeCode {
	const node = bindNode(run, i, scope);
	const sample =
		run.gathers === null
			? mapLanes(run, i, node, scope, slots)
			: reduce(run, i, node, scope, slots);
	return { before: [], sample, after: [] };
}

function bindNode(run: NodeRun, i: number, scope: DriverScope): NodeNames {
	return {
		tick: scope.bind(`T${i}`, run.tick),
		ins: scope.bind(`I${i}`, run.ins),
		outs: scope.bind(`O${i}`, run.outs),
		config: scope.bind(`C${i}`, run.config),
	};
}

function mapLanes(
	run: NodeRun,
	i: number,
	node: NodeNames,
	scope: DriverScope,
	slots: SlotAccess,
): string[] {
	const bindings = run.bindings as readonly LaneBindings[];
	const lines: string[] = [];
	for (let lane = 0; lane < run.laneCount; lane++) {
		const b = bindings[lane] as LaneBindings;
		lines.push(
			`// node ${i} lane ${lane}`,
			...emitLaneGathers(b, node.ins, `L${i}_${lane}`, scope, slots),
			emitMapTickCall(node, scope.bind(`S${i}_${lane}`, run.states[lane])),
			...emitScatter(run, lane, (j) => outRead(run, node, j)),
		);
	}
	return lines;
}

function reduce(
	run: NodeRun,
	i: number,
	node: NodeNames,
	scope: DriverScope,
	slots: SlotAccess,
): string[] {
	const gathers = run.gathers as ReduceGathers;
	return [
		`// node ${i} reduce`,
		...emitReduceGathers(gathers, node.ins, `G${i}`, scope, slots),
		emitReduceTickCall(node, scope.bind(`S${i}_0`, run.states[0]), gathers.width),
		...emitScatter(run, 0, (j) => outRead(run, node, j)),
	];
}

function outRead(run: NodeRun, node: NodeNames, j: number): string {
	return `${node.outs}${propKey(run.outPorts[j] as string)}`;
}
