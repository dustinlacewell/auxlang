/**
 * One lane's state between memory and JS. A read gives the lane as JS
 * `collectState` does: every field with a memory form, the engine's `__lane`,
 * `__seed` and `__rng` included, `__scratch` (derived data) left out. A write
 * carries a lane in as runtime/hand-over/carry-states.ts does: the shape's
 * fields, `__rng` only when the seed is unchanged.
 */

import type { Field } from "../../layout/state-shape";
import type { LaneMemory } from "../../program/memory-layout";
import { shapeKeys } from "../carry/lane-fits";
import { readShape, writeShape } from "./shape-codec";

const SCRATCH = "__scratch";
const STREAM = "__rng";

export function readLane(memory: ArrayBuffer, lane: LaneMemory): Record<string, unknown> {
	const state: Record<string, unknown> = {};
	for (const [name, at] of Object.entries(lane.state))
		state[name] = new Float64Array(memory, at, 1)[0];
	for (const [name, field] of Object.entries(lane.aggregates))
		if (name !== SCRATCH) state[name] = readShape(memory, field.offset, field.shape);
	return state;
}

export function writeLane(
	memory: ArrayBuffer,
	lane: LaneMemory,
	carried: Record<string, unknown>,
	keepStream: boolean,
): void {
	for (const name of shapeKeys(lane.state)) {
		if (name === STREAM && !keepStream) continue;
		new Float64Array(memory, lane.state[name] as number, 1)[0] = Number(carried[name]);
	}
	for (const name of shapeKeys(lane.aggregates)) {
		const field = lane.aggregates[name] as Field;
		writeShape(memory, field.offset, field.shape, carried[name]);
	}
}
