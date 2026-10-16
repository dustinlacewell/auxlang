/**
 * The carry plan (wasm/host/carry-plan.ts) on hand-built layouts: which
 * lanes carry (fit by state shape), which fields (never the engine's,
 * `__rng` only under the same seed), joined runs, feedback slots, the sample
 * count; and the copy itself keeps every bit.
 */

import type { RecordState, StateShape } from "@/core3/module/front/state/state-shape";
import type { KeyedIdentity } from "@/core3/types";
import { type CarrySide, planCarry } from "@/core3/wasm/host/carry-plan";
import {
	CARRY_DEREF,
	CARRY_F64,
	CARRY_POP,
	CARRY_REL,
	CARRY_WORD,
	RUN_WIDTH,
} from "@/core3/wasm/host/carry/carry-run";
import { bindCarry, runCarry } from "@/core3/wasm/host/carry/run-carry";
import { memoryViews } from "@/core3/wasm/host/wasm-memory";
import type { Field, Shape } from "@/core3/wasm/layout/state-shape";
import type { LaneMemory, NodeMemory } from "@/core3/wasm/program/memory-layout";
import { describe, expect, it } from "vitest";

const f32s = (length: number, offset: number): Field => ({
	offset,
	shape: { k: "array", type: "f32", length },
});

/** A lane at `base`: n, phase, __rng, __lane, __seed in order, then `aggregates`. */
function lane(base: number, aggregates: Record<string, Field> = {}): LaneMemory {
	const state = {
		n: base,
		phase: base + 8,
		__rng: base + 16,
		__lane: base + 24,
		__seed: base + 32,
	};
	const fields: Record<string, StateShape> = {};
	for (const name of Object.keys(state)) fields[name] = { k: "number" };
	for (const [name, field] of Object.entries(aggregates)) fields[name] = stateOf(field.shape);
	const shape: RecordState = { k: "record", fields };
	return { shape, state, aggregates, cache: 0, cacheSlots: 0, tables: null, rowBytes: 0, lambdas: {} };
}

/** The state shape a hand-built layout shape lays out: the layout without its offsets. */
function stateOf(shape: Shape): StateShape {
	switch (shape.k) {
		case "number":
		case "array":
			return shape;
		case "record":
			return {
				k: "record",
				fields: Object.fromEntries(
					Object.entries(shape.fields).map(([name, field]) => [name, stateOf(field.shape)]),
				),
			};
		case "records":
			return {
				k: "records",
				length: shape.length,
				element: stateOf(shape.element) as RecordState,
			};
	}
}

interface SideSpec {
	readonly nodes: readonly NodeMemory[];
	readonly keys: readonly string[];
	readonly paired?: readonly (readonly [number, string])[];
	readonly seeds?: readonly number[];
	readonly feedback?: readonly { node: number; port: string; start: number }[];
	readonly rate?: number;
}

function side({
	nodes,
	keys,
	paired = [],
	seeds,
	feedback = [],
	rate = 48000,
}: SideSpec): CarrySide {
	return {
		layout: {
			pages: 1,
			outL: 0,
			outR: 512,
			cur: 1024,
			count: 1016,
			size: 4,
			slots: 1056,
			slotCount: 0,
			nodes,
			heap: 2048,
		},
		facts: {
			identities: keys.map((key) => ({ key }) as KeyedIdentity),
			paired,
			seeds: seeds ?? nodes.map(() => 1),
			tables: nodes.map(() => null),
			feedback,
			outputs: {
				size: 4,
				bases: nodes.map((_, i) => ({ out: 2 * i })),
				laneCounts: nodes.map(() => 2),
			},
			sampleRate: rate,
			slotSites: [],
		},
	};
}

const node = (...lanes: LaneMemory[]): NodeMemory => ({ outs: {}, views: {}, groups: {}, lanes });

/** The plan's runs as tuples, in bytes: [from, to, bytes, type]. */
function runs(plan: Int32Array): [number, number, number, number][] {
	const out: [number, number, number, number][] = [];
	for (let r = 0; r < plan.length; r += RUN_WIDTH) {
		const unit = plan[r + 3] === CARRY_F64 ? 8 : 4;
		out.push([
			(plan[r] as number) * unit,
			(plan[r + 1] as number) * unit,
			(plan[r + 2] as number) * unit,
			plan[r + 3] as number,
		]);
	}
	return out;
}

const COUNT: [number, number, number, number] = [1016, 1016, 8, CARRY_F64];

describe("planCarry", () => {
	it("carries the count, then each fitting lane's fields as joined runs, skipping the engine's", () => {
		const old = side({ nodes: [node(lane(2000, { buf: f32s(3, 2040) }))], keys: ["a"] });
		const fresh = side({
			nodes: [node(lane(3000, { buf: f32s(3, 3040) }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		expect(runs(planCarry(old, fresh))).toEqual([
			COUNT,
			[2000, 3000, 24, CARRY_F64], // n, phase, __rng: one run
			[2040, 3040, 16, CARRY_WORD], // 3 floats, rounded to 8 bytes
		]);
	});

	it("keeps the fresh stream when the seed changed", () => {
		const old = side({ nodes: [node(lane(2000))], keys: ["a"], seeds: [1] });
		const fresh = side({ nodes: [node(lane(3000))], keys: ["a"], paired: [[0, "a"]], seeds: [2] });
		expect(runs(planCarry(old, fresh))).toEqual([COUNT, [2000, 3000, 16, CARRY_F64]]);
	});

	it("leaves fresh a lane that does not fit, a lane the old node lacks, and an unpaired node", () => {
		const wrongType: Field = { offset: 3040, shape: { k: "array", type: "i32", length: 3 } };
		const old = side({ nodes: [node(lane(2000, { buf: f32s(3, 2040) }))], keys: ["a"] });
		const resized = side({
			nodes: [node(lane(3000, { buf: f32s(4, 3040) })), node(lane(4000))],
			keys: ["a", "b"],
			paired: [[0, "a"]],
		});
		const retyped = side({
			nodes: [node(lane(3000, { buf: wrongType }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		const extraKey = side({
			nodes: [node(lane(3000, { buf: f32s(3, 3040), more: f32s(2, 3056) }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		const wider = side({
			nodes: [node(lane(3000, { buf: f32s(3, 3040) }), lane(3100, { buf: f32s(3, 3140) }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		expect(runs(planCarry(old, resized))).toEqual([COUNT]);
		expect(runs(planCarry(old, retyped))).toEqual([COUNT]);
		expect(runs(planCarry(old, extraKey))).toEqual([COUNT]);
		expect(runs(planCarry(old, wider))).toHaveLength(3); // lane 0 carries, lane 1 stays fresh
	});

	it("matches record fields by name, whatever their order", () => {
		const record = (x: number, y: number) => ({
			k: "record" as const,
			size: 16,
			fields: {
				x: { offset: x, shape: { k: "number" as const } },
				y: { offset: y, shape: { k: "number" as const } },
			},
		});
		const old = side({
			nodes: [node(lane(2000, { r: { offset: 2040, shape: record(0, 8) } }))],
			keys: ["a"],
		});
		const fresh = side({
			nodes: [node(lane(3000, { r: { offset: 3040, shape: record(8, 0) } }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		expect(runs(planCarry(old, fresh)).slice(2)).toEqual([
			[2040, 3048, 8, CARRY_F64],
			[2048, 3040, 8, CARRY_F64],
		]);
	});

	it("carries a paired source's feedback slots, the lanes both engines feed back", () => {
		const fb = [{ node: 0, port: "out", start: 0 }];
		const old = side({ nodes: [node(lane(2000))], keys: ["a"], feedback: fb });
		const fresh = side({
			nodes: [node(lane(3000))],
			keys: ["a"],
			paired: [[0, "a"]],
			feedback: fb,
		});
		const notFedBefore = side({ nodes: [node(lane(2000))], keys: ["a"] });
		expect(runs(planCarry(old, fresh)).at(-1)).toEqual([1024, 1024, 16, CARRY_F64]);
		expect(runs(planCarry(notFedBefore, fresh))).toHaveLength(2);
	});

	it("carries only the count across a sample-rate change", () => {
		const fb = [{ node: 0, port: "out", start: 0 }];
		const old = side({ nodes: [node(lane(2000))], keys: ["a"], feedback: fb });
		const fresh = side({
			nodes: [node(lane(3000))],
			keys: ["a"],
			paired: [[0, "a"]],
			feedback: fb,
			rate: 44100,
		});
		expect(runs(planCarry(old, fresh))).toEqual([COUNT]);
	});
});

describe("runCarry", () => {
	it("copies every bit: NaN payloads in words, -0 in f64s", () => {
		const from = memoryViews(new ArrayBuffer(64));
		const to = memoryViews(new ArrayBuffer(64));
		from.f64[0] = -0;
		from.i32[4] = 0x7fa00001; // a signalling-NaN f32 pattern
		from.i32[5] = -1;
		runCarry(bindCarry(Int32Array.from([0, 1, 1, CARRY_F64, 4, 8, 2, CARRY_WORD]), from, to));
		expect(Object.is(to.f64[1], -0)).toBe(true);
		expect([to.i32[8], to.i32[9]]).toEqual([0x7fa00001, -1]);
	});

	it("reads a rebound field where its old slot points at the swap, nested slots too", () => {
		const f64s = (offset: number) => ({
			offset,
			shape: { k: "array" as const, type: "f64" as const, length: 1 },
		});
		const inner = (pointer: number | undefined) => ({
			k: "record" as const,
			size: pointer === undefined ? 8 : 16,
			fields: { buf: pointer === undefined ? f64s(0) : { ...f64s(0), pointer } },
		});
		// Old: `r` at 2040 (slot 2056) holds a record whose `buf` has its slot at +8.
		const old = side({
			nodes: [node(lane(2000, { r: { offset: 2040, shape: inner(8), pointer: 2056 } }))],
			keys: ["a"],
		});
		const fresh = side({
			nodes: [node(lane(3000, { r: { offset: 3040, shape: inner(undefined) } }))],
			keys: ["a"],
			paired: [[0, "a"]],
		});
		const plan = planCarry(old, fresh);
		expect(
			runs(plan)
				.slice(2)
				.map((r) => r[3]),
		).toEqual([CARRY_DEREF, CARRY_DEREF, CARRY_REL, CARRY_POP, CARRY_POP]);
		const from = memoryViews(new ArrayBuffer(4096));
		const to = memoryViews(new ArrayBuffer(4096));
		from.i32[2056 / 4] = 2400; // r names the record at 2400
		from.i32[2408 / 4] = 2600; // its buf names the array at 2600
		from.f64[2600 / 8] = 7.5;
		runCarry(bindCarry(plan, from, to));
		expect(to.f64[3040 / 8]).toBe(7.5);
	});
});
