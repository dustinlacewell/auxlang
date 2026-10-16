/**
 * One lane's state between memory and JS. A read gives the lane as JS
 * `collectState` does: every field with a memory form, the engine's `__lane`,
 * `__seed` and `__rng` included, `__scratch` (derived data) left out. A write
 * carries a lane in as runtime/hand-over/carry-states.ts does: the given
 * fields (carry-fields.ts picked them), `__rng` only when the seed is
 * unchanged.
 */

import type { Field } from "../../layout/state-shape";
import type { LaneMemory } from "../../program/memory-layout";
import { readField, writeField } from "./shape-codec";

const SCRATCH = "__scratch";

export function readLane(memory: ArrayBuffer, lane: LaneMemory): Record<string, unknown> {
	const state: Record<string, unknown> = {};
	for (const [name, at] of Object.entries(lane.state))
		state[name] = new Float64Array(memory, at, 1)[0];
	for (const [name, field] of Object.entries(lane.aggregates))
		if (name !== SCRATCH) state[name] = readField(memory, 0, field);
	return state;
}

export function writeLane(
	memory: ArrayBuffer,
	lane: LaneMemory,
	carried: Record<string, unknown>,
	fields: readonly string[],
	keepStream: boolean,
): void {
	for (const name of fields) {
		if (name === "__rng" && !keepStream) continue;
		const at = lane.state[name];
		if (at !== undefined) {
			new Float64Array(memory, at, 1)[0] = Number(carried[name]);
			continue;
		}
		writeField(memory, 0, lane.aggregates[name] as Field, carried[name]);
	}
}
