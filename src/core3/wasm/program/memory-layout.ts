/**
 * Linear memory for one program, fixed at eval from the shapes the engine
 * built (MANIFESTO §5.1): the two output blocks (f32), the value buffer
 * (f64 per slot, as the engine's `cur`), then per node its outputs record,
 * the f64 lane views its reducer inputs are gathered into, and per lane its
 * numeric state fields, its typed arrays and records (state-layout.ts), its
 * math call cache and (a module that reads a pattern) its event table.
 * Everything is f64 except the f32 output blocks, which the JS engine also
 * holds as Float32Arrays, and typed arrays, which keep their element type.
 */

import { TABLE_ROW_FIELDS } from "../../module/tick-subset/table-intrinsics";
import type { NodeRun } from "../../runtime/node-run";
import type { ModuleSource } from "../../types";
import type { Field } from "../layout/state-shape";
import { planAggregates } from "./state-layout";

/** Samples per render call at most (the AudioWorklet quantum). */
export const BLOCK_MAX = 128;

/** Rows per lane event table. */
export const TABLE_CAPACITY = 256;

/** A table: cycle and count, then each row field (TABLE_ROW_FIELDS order) as f64 rows. */
export const TABLE_HEADER = 16;

export interface LaneMemory {
	/** Numeric state field → address. */
	readonly state: Readonly<Record<string, number>>;
	/** Typed array, record and array-of-records state fields, at absolute addresses. */
	readonly aggregates: Readonly<Record<string, Field>>;
	readonly cache: number;
	readonly cacheSlots: number;
	/** The lane's event table when its module reads a pattern, else null. */
	readonly table: number | null;
}

export interface NodeMemory {
	readonly outs: Readonly<Record<string, number>>;
	/** Reducer input port → its f64 view. */
	readonly views: Readonly<Record<string, number>>;
	readonly lanes: readonly LaneMemory[];
}

export interface WasmLayout {
	readonly pages: number;
	readonly outL: number;
	readonly outR: number;
	readonly cur: number;
	readonly size: number;
	readonly nodes: readonly NodeMemory[];
}

export function planMemory(
	runs: readonly NodeRun[],
	readsPattern: readonly boolean[],
	sources: readonly ModuleSource[],
	size: number,
): WasmLayout {
	let top = 0;
	const take = (bytes: number): number => {
		const at = top;
		top += Math.ceil(bytes / 8) * 8;
		return at;
	};
	const outL = take(4 * BLOCK_MAX);
	const outR = take(4 * BLOCK_MAX);
	const cur = take(8 * size);
	const nodes = runs.map((run, i) => {
		const outs = Object.fromEntries(run.outPorts.map((p) => [p, take(8)]));
		const views: Record<string, number> = {};
		for (const port of run.gathers?.ports ?? []) {
			if (port.view !== null) views[port.name] = take(8 * port.srcLanes);
		}
		const slots = cacheSlots(sources[i] as ModuleSource);
		const lanes = run.states.map((state) => ({
			state: Object.fromEntries(numericFields(state).map((f) => [f, take(8)])),
			aggregates: planAggregates(state, take),
			cache: take(8 * slots),
			cacheSlots: slots,
			table: readsPattern[i]
				? take(TABLE_HEADER + 8 * TABLE_ROW_FIELDS.length * TABLE_CAPACITY)
				: null,
		}));
		return { outs, views, lanes };
	});
	return { pages: Math.max(1, Math.ceil(top / 65536)), outL, outR, cur, size, nodes };
}

/** A table field's row address. */
export function tableRow(table: number, field: number, row: number): number {
	return table + TABLE_HEADER + 8 * (field * TABLE_CAPACITY + row);
}

/** The engine's numeric fields count: `__rng` (the stream position), `__seed`, `__lane`. */
function numericFields(state: Record<string, unknown>): string[] {
	return Object.keys(state).filter(
		(f) => typeof state[f] === "number" || typeof state[f] === "boolean",
	);
}

/** One past the highest `__mc[slot]` in the tick and helpers. */
function cacheSlots(source: ModuleSource): number {
	let slots = 0;
	for (const text of [source.tick, ...Object.values(source.helpers)]) {
		for (const m of text.matchAll(/__mc\[(\d+)\]/g)) slots = Math.max(slots, Number(m[1]) + 1);
	}
	return slots;
}
