/**
 * Codegen driver: unrolls the interpreter's node loop into one generated
 * function per program. Each (node, lane) becomes straight-line code —
 * gathers with baked slots, one static tick call site, a baked scatter — over
 * the SAME built runs the interpreter walks (states, ins/outs records,
 * bindings, gathers), so the two drivers share one source of semantics.
 * Only numbers and JSON-quoted keys are baked into the source; every object
 * is passed in through the driver's scope.
 */

import type { LaneBindings } from "../bindings";
import type { Driver } from "../driver";
import type { ReduceGathers } from "../gathers";
import type { NodeRun } from "../node-run";
import { DriverScope } from "./driver-scope";
import { emitLaneGathers } from "./emit-lane-gathers";
import { emitReduceGathers } from "./emit-reduce-gathers";
import { emitScatter } from "./emit-scatter";
import { type NodeNames, emitMapTickCall, emitReduceTickCall } from "./emit-tick-call";

export function compileDriver(runs: readonly NodeRun[]): Driver {
	const scope = new DriverScope();
	const body = runs.flatMap((run, i) => emitNode(run, i, scope));
	return scope.instantiate(body.join("\n"));
}

function emitNode(run: NodeRun, i: number, scope: DriverScope): string[] {
	const node = bindNode(run, i, scope);
	return run.gathers === null
		? emitMapNode(run, i, node, scope)
		: emitReduceNode(run, i, node, scope);
}

function bindNode(run: NodeRun, i: number, scope: DriverScope): NodeNames {
	return {
		tick: scope.bind(`T${i}`, run.tick),
		ins: scope.bind(`I${i}`, run.ins),
		outs: scope.bind(`O${i}`, run.outs),
		config: scope.bind(`C${i}`, run.config),
	};
}

function emitMapNode(run: NodeRun, i: number, node: NodeNames, scope: DriverScope): string[] {
	const bindings = run.bindings as readonly LaneBindings[];
	const lines: string[] = [];
	for (let lane = 0; lane < run.laneCount; lane++) {
		lines.push(
			`// node ${i} lane ${lane}`,
			...emitLaneGathers(bindings[lane] as LaneBindings, node.ins, `L${i}_${lane}`, scope),
			emitMapTickCall(node, scope.bind(`S${i}_${lane}`, run.states[lane])),
			...emitScatter(run, node.outs, lane),
		);
	}
	return lines;
}

function emitReduceNode(run: NodeRun, i: number, node: NodeNames, scope: DriverScope): string[] {
	const gathers = run.gathers as ReduceGathers;
	return [
		`// node ${i} reduce`,
		...emitReduceGathers(gathers, node.ins, `G${i}`, scope),
		emitReduceTickCall(node, scope.bind(`S${i}_0`, run.states[0]), gathers.width),
		...emitScatter(run, node.outs, 0),
	];
}
