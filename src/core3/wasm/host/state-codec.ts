/**
 * An instance's state as an `EngineState`, and back: for snapshots, tests
 * and `collectState`. Not on the swap path (carry-plan.ts is).
 *
 * A read gives what the JS engine's `collectState` gives: each node's lanes
 * by migration key (codec/lane-codec.ts), the fed-back outputs, the rate and
 * the sample count. A write makes a freshly initialised instance continue a
 * snapshot as the JS engine continues one (runtime/live-engine.ts
 * `handOver`): at the same rate, each paired node's lanes whose state fits
 * the fresh JS state (module/front/state/shape-fits.ts) and the feedback values; at any
 * rate, the sample count and the live slots by site.
 */

import { shapeFits } from "../../module/front/state/shape-fits";
import { laneShapeOf } from "../../module/front/state/state-shape-of";
import { captureFeedback, restoreFeedback } from "../../runtime/feedback";
import { type SlotEntries, carriedSlots } from "../../runtime/live/slot-carry";
import type { NodeRun } from "../../runtime/node-run";
import type { EngineState, KeyedIdentity } from "../../types";
import type { WasmLayout } from "../program/memory-layout";
import { readLane, writeLane } from "./codec/lane-codec";
import type { EngineFacts } from "./engine-facts";

/** One instance's memory with what names it. */
export interface CodecTarget {
	readonly memory: ArrayBuffer;
	readonly layout: WasmLayout;
	readonly facts: EngineFacts;
}

export function readEngineState({ memory, layout, facts }: CodecTarget): EngineState {
	const nodes: Record<string, Record<string, unknown>[]> = {};
	layout.nodes.forEach((node, i) => {
		const key = (facts.identities[i] as KeyedIdentity).key;
		nodes[key] = node.lanes.map((lane) => readLane(memory, lane));
	});
	return {
		nodes,
		identities: facts.identities,
		feedback: captureFeedback(
			facts.feedback,
			facts.identities,
			facts.outputs,
			values(memory, layout),
		),
		sampleRate: facts.sampleRate,
		sampleCount: new Float64Array(memory, layout.count, 1)[0] as number,
		...(layout.slotCount > 0 ? { liveSlots: readSlots(memory, layout, facts) } : {}),
	};
}

function readSlots(memory: ArrayBuffer, layout: WasmLayout, facts: EngineFacts): SlotEntries {
	const slots = liveSlots(memory, layout);
	return facts.slotSites.map((site, i) => [site, slots[i] as number] as const);
}

function liveSlots(memory: ArrayBuffer, layout: WasmLayout): Float64Array {
	return new Float64Array(memory, layout.slots, layout.slotCount);
}

/** `fresh`: the built runs the instance was initialised from (their states are the fresh shapes). */
export function writeEngineState(
	{ memory, layout, facts }: CodecTarget,
	fresh: readonly NodeRun[],
	state: EngineState,
): void {
	if (state.sampleRate === facts.sampleRate)
		for (const [node, key] of facts.paired)
			carryNode(memory, layout, (fresh[node] as NodeRun).states, state.nodes[key], node);
	const paired = new Map(facts.paired);
	restoreFeedback(
		facts.feedback,
		paired,
		facts.outputs,
		facts.sampleRate,
		state,
		values(memory, layout),
	);
	new Float64Array(memory, layout.count, 1)[0] = state.sampleCount;
	carriedSlots(facts.slotSites, state.liveSlots, liveSlots(memory, layout));
}

function carryNode(
	memory: ArrayBuffer,
	layout: WasmLayout,
	fresh: readonly Record<string, unknown>[],
	old: readonly Record<string, unknown>[] | undefined,
	node: number,
): void {
	if (old === undefined) return;
	fresh.forEach((to, l) => {
		const from = old[l];
		const lane = layout.nodes[node]?.lanes[l];
		if (from === undefined || lane === undefined || !shapeFits(laneShapeOf(from), laneShapeOf(to)))
			return;
		writeLane(memory, lane, from, from.__seed === to.__seed);
	});
}

/** The value buffer (the engine's `cur`) as a view. */
function values(memory: ArrayBuffer, layout: WasmLayout): Float64Array {
	return new Float64Array(memory, layout.cur, layout.size);
}
