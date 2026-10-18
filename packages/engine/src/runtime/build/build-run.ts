/**
 * One node's run (node-run.ts) from its program node, spec, the output
 * layout and its lane states: reused ins/outs records, out slot bases, and
 * the compiled bindings (map) or gathers (reduce). Hydrates the node's
 * lambdas. A node whose lane records disagree with its policy is a loud
 * error.
 */

import { nodePorts } from "../../dsp/node-ports";
import type { ModuleSpec, PNode } from "../../types";
import { compileLaneBindings } from "../bindings";
import { compileReduceGathers } from "../gathers";
import { groupViews } from "../group-view";
import type { NodeRun } from "../node-run";
import type { OutputLayout } from "../output-slots";

export function buildRun(
	node: PNode,
	i: number,
	spec: ModuleSpec,
	layout: OutputLayout,
	states: Record<string, unknown>[],
): NodeRun {
	const reduce = spec.policy === "reduce";
	assertLanes(node, i, reduce);
	const ports = nodePorts(spec, node.groups);
	const outPorts = Object.keys(ports.outs);
	const bases = layout.bases[i] as Record<string, number>;
	const outBases = Int32Array.from(outPorts, (port) => bases[port] as number);
	return {
		tick: spec.tick,
		config: { ...spec.config, ...node.config },
		...(spec.monitor !== undefined ? { monitor: spec.monitor } : {}),
		laneCount: node.lanes.length,
		states,
		ins: zeroRecord(Object.keys(ports.ins)) as NodeRun["ins"],
		outs: zeroRecord(outPorts),
		outPorts,
		outBases,
		bindings: reduce
			? null
			: node.lanes.map((_, lane) => compileLaneBindings(node, i, spec, layout, lane)),
		gathers: reduce ? compileReduceGathers(node, i, spec, layout) : null,
		groups: groupViews(spec, ports.groups),
	};
}

function assertLanes(node: PNode, i: number, reduce: boolean): void {
	if (reduce && node.lanes.length !== 1) {
		throw new Error(
			`node #${i} ('${node.module}') is reduce policy but has ${node.lanes.length} lanes`,
		);
	}
	if (!reduce && node.lanes.length !== node.width) {
		throw new Error(
			`node #${i} ('${node.module}') width ${node.width} does not match ${node.lanes.length} lane records`,
		);
	}
}

function zeroRecord(keys: readonly string[]): Record<string, number> {
	const record: Record<string, number> = {};
	for (const key of keys) record[key] = 0;
	return record;
}
