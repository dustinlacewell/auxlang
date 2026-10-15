/**
 * Where a bound value lives, as plain data. Code is generated against one
 * built plan (on the main thread) and run against another (the worklet's
 * engine); a binding path names the value by its place in the node runs, so
 * the generated source travels without its objects. `pathIndex` maps each
 * value of a plan to its path; `resolvePath` finds the value in another plan
 * of the same program.
 */

import { tickFactory } from "../../module/tick-build/tick-factories";
import type { NodeRun } from "../node-run";

export type BindingPath =
	| { readonly k: "tick" | "ins" | "outs" | "config"; readonly node: number }
	/** The factory of a node's tick, when it keeps math call caches (tick-build/tick-factories.ts). */
	| { readonly k: "tick-factory"; readonly node: number }
	| { readonly k: "state"; readonly node: number; readonly lane: number }
	| { readonly k: "lambda"; readonly node: number; readonly lane: number; readonly port: number }
	| { readonly k: "gather-lambda" | "view"; readonly node: number; readonly port: number }
	/** The driver's block buffer (codegen/group/block-slots.ts), one per driver instance. */
	| { readonly k: "block"; readonly length: number }
	/** A function of the driver's helpers unit, by index. */
	| { readonly k: "helper"; readonly index: number };

/** Every value of `runs` a driver can bind, by identity, with its path; the first path wins. */
export function pathIndex(runs: readonly NodeRun[]): Map<unknown, BindingPath> {
	const index = new Map<unknown, BindingPath>();
	const add = (value: unknown, path: BindingPath) => {
		if (value !== null && !index.has(value)) index.set(value, path);
	};
	runs.forEach((run, node) => {
		add(run.tick, { k: "tick", node });
		const factory = tickFactory(run.tick);
		if (factory !== undefined) add(factory, { k: "tick-factory", node });
		add(run.ins, { k: "ins", node });
		add(run.outs, { k: "outs", node });
		add(run.config, { k: "config", node });
		run.states.forEach((state, lane) => add(state, { k: "state", node, lane }));
		run.bindings?.forEach((b, lane) =>
			b.lambdas.forEach((slot, port) => add(slot, { k: "lambda", node, lane, port })),
		);
		run.gathers?.ports.forEach((p, port) => {
			add(p.lambda, { k: "gather-lambda", node, port });
			add(p.view, { k: "view", node, port });
		});
	});
	return index;
}

/** The values a path can name outside the runs, per driver instance. */
export interface PathExtras {
	readonly block: Float64Array;
	readonly helpers: readonly unknown[];
}

export function resolvePath(
	path: BindingPath,
	runs: readonly NodeRun[],
	extras: PathExtras,
): unknown {
	switch (path.k) {
		case "block":
			return extras.block;
		case "helper":
			return extras.helpers[path.index];
		case "tick-factory":
			return tickFactory(run(runs, path.node).tick);
		case "state":
			return run(runs, path.node).states[path.lane];
		case "lambda":
			return run(runs, path.node).bindings?.[path.lane]?.lambdas[path.port];
		case "gather-lambda":
			return run(runs, path.node).gathers?.ports[path.port]?.lambda;
		case "view":
			return run(runs, path.node).gathers?.ports[path.port]?.view;
		default:
			return run(runs, path.node)[path.k];
	}
}

function run(runs: readonly NodeRun[], node: number): NodeRun {
	const found = runs[node];
	if (found === undefined) throw new Error(`codegen: binding path names missing node #${node}`);
	return found;
}
