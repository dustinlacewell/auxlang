/**
 * The runs that carry feedback (runtime/feedback.ts): for each output a new
 * z-edge reads whose node is paired, the old value slot of each lane the old
 * engine also fed back, into the new slot. Every other slot keeps the start
 * value the fresh memory holds.
 */

import { slotOf } from "../../../runtime/output-slots";
import type { CarrySide } from "../carry-plan";
import { CARRY_F64 } from "./carry-run";
import type { RunList } from "./run-list";

export function feedbackRuns(
	runs: RunList,
	old: CarrySide,
	fresh: CarrySide,
	oldIndex: ReadonlyMap<number, number>,
): void {
	for (const { node, port } of fresh.facts.feedback) {
		const from = oldIndex.get(node);
		if (from === undefined || !fedBack(old, from, port)) continue;
		const lanes = Math.min(
			old.facts.outputs.laneCounts[from] as number,
			fresh.facts.outputs.laneCounts[node] as number,
		);
		for (let lane = 0; lane < lanes; lane++)
			runs.add(slot(old, from, port, lane), slot(fresh, node, port, lane), 8, CARRY_F64);
	}
}

function fedBack(side: CarrySide, node: number, port: string): boolean {
	return side.facts.feedback.some((read) => read.node === node && read.port === port);
}

function slot(side: CarrySide, node: number, port: string, lane: number): number {
	return side.layout.cur + 8 * slotOf(side.facts.outputs, node, port, lane);
}
