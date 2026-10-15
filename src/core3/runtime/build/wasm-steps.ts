/**
 * The steps that make a WASM engine in the worklet once the program's start
 * values are built (engine-build.ts, no driver), in order, each with its
 * estimated cost (step-costs.ts):
 *
 * - instantiate the posted Module (it allocates memory: never the swap block);
 * - touch its memory, TOUCH_PAGES pages a step (wasm/host/touch-pages.ts),
 *   so no later write faults a page in;
 * - write the start values into memory (wasm/host/init-memory.ts): the value
 *   buffer, then a lane a step, costed by its state's size;
 * - make the engine over that memory (its seq tables' empty slots);
 * - prefill each table lane;
 * - last, when the engine continues another, bind the carry's views on both
 *   memories and copy once (the swap copies again; nothing renders between
 *   the last step and the swap, so the views stay current).
 *
 * Pure.
 */

import { CARRY_F64, RUN_WIDTH } from "../../wasm/host/carry/carry-run";
import type { LaneMemory } from "../../wasm/program/memory-layout";
import { sizeOf } from "../../wasm/program/state-layout";
import type { WasmPrepared } from "../prepare/wasm-prepared";
import { STEP_COSTS } from "./step-costs";

/** WASM pages touched per step. */
export const TOUCH_PAGES = 4;

export type WasmStep =
	| { readonly k: "instantiate" | "values" | "engine" | "bind"; readonly cost: number }
	| { readonly k: "touch"; readonly page: number; readonly count: number; readonly cost: number }
	| { readonly k: "lane"; readonly node: number; readonly lane: number; readonly cost: number }
	| { readonly k: "prefill"; readonly lane: number; readonly cost: number };

export function wasmSteps(wasm: WasmPrepared, tableLanes: number, carries: boolean): WasmStep[] {
	const { layout } = wasm;
	return [
		{ k: "instantiate", cost: STEP_COSTS.instantiate },
		...touchSteps(layout.pages),
		{ k: "values", cost: STEP_COSTS.valuesPerNode * layout.nodes.length },
		...layout.nodes.flatMap((node, n) =>
			node.lanes.map((lane, l) => ({ k: "lane" as const, node: n, lane: l, cost: laneCost(lane) })),
		),
		{ k: "engine", cost: STEP_COSTS.engineBase + STEP_COSTS.enginePerTableLane * tableLanes },
		...Array.from({ length: tableLanes }, (_, lane) => ({
			k: "prefill" as const,
			lane,
			cost: STEP_COSTS.prefillPerLane,
		})),
		...(carries ? [{ k: "bind" as const, cost: bindCost(wasm.carry?.plan) }] : []),
	];
}

function bindCost(plan: Int32Array | undefined): number {
	if (plan === undefined) return 0;
	let bytes = 0;
	for (let r = 0; r < plan.length; r += RUN_WIDTH)
		bytes += (plan[r + 2] as number) * (plan[r + 3] === CARRY_F64 ? 8 : 4);
	const runs = plan.length / RUN_WIDTH;
	return STEP_COSTS.bindPerRun * runs + (STEP_COSTS.bindPerKilobyte * bytes) / 1024;
}

function touchSteps(pages: number): WasmStep[] {
	const steps: WasmStep[] = [];
	for (let page = 0; page < pages; page += TOUCH_PAGES) {
		const count = Math.min(TOUCH_PAGES, pages - page);
		steps.push({ k: "touch", page, count, cost: STEP_COSTS.touchPerPage * count });
	}
	return steps;
}

function laneCost(lane: LaneMemory): number {
	let bytes = 0;
	for (const field of Object.values(lane.aggregates)) bytes += sizeOf(field.shape);
	return STEP_COSTS.laneBase + (STEP_COSTS.lanePerKilobyte * bytes) / 1024;
}
