/**
 * Linear memory for one program, fixed at eval from the shapes the engine
 * built (MANIFESTO §5.1): the two output blocks (f32), the value buffer
 * (f64 per slot, as the engine's `cur`), the sample count, the live slots
 * (f64 each, written by the host between renders), then per node its
 * outputs record, the f64 lane views its reducer inputs are gathered into,
 * an f64 array per port group (its members are fixed at eval), and per lane its numeric state fields, its typed arrays and records
 * (state-layout.ts), its math call cache, (a module that reads a pattern)
 * its table slot, and each lambda input's own math cache; then, only when
 * monitored, the monitor region (runtime/live/monitor-region.ts). `displays`
 * names no memory of its own: each entry just points at a display node's
 * already-placed buffer and head fields, for a host to copy from. The table heap
 * starts above all of it (layout/table-format.ts, host/table-heap.ts); the
 * first pages hold each table lane's two tables at their initial size.
 * Everything is f64 except the f32 output blocks, which the JS engine also
 * holds as Float32Arrays, and typed arrays, which keep their element type.
 */

import type { ModuleIR } from "../../module/front/module/module-ir";
import { fieldRebinds } from "../../module/front/scope/field-rebinds";
import type { RecordState } from "../../module/front/state/state-shape";
import { laneShapeOf } from "../../module/front/state/state-shape-of";
import { elementRebinds } from "../../module/front/types/element-rebinds";
import type { FunctionPlan } from "../../module/front/types/function-plan";
import { regionWords } from "../../runtime/live/monitor-region";
import type { NodeRun } from "../../runtime/node-run";
import type { NodePlans } from "../../runtime/specialise/specialise-nodes";
import { cacheSlotsIn } from "../compile/cache-slots";
import type { Field } from "../layout/state-shape";
import { recordColumns } from "../../bridge/lane-table";
import { INITIAL_ROWS, SLOT_BYTES, rowBytes, tableBytes } from "../layout/table-format";
import type { LambdaSource, LambdaSources } from "./lambda-sources";
import { planAggregates } from "./state-layout";

/** Samples per render call at most (the AudioWorklet quantum). */
export const BLOCK_MAX = 128;

/** Bytes per memory page. */
export const PAGE = 65536;

export interface LaneMemory {
	/** The lane's state shape (module/front/state/state-shape.ts): what the carry fits by. */
	readonly shape: RecordState;
	/** Numeric state field → address. */
	readonly state: Readonly<Record<string, number>>;
	/** Typed array, record and array-of-records state fields, at absolute addresses (rebound ones with a pointer slot). */
	readonly aggregates: Readonly<Record<string, Field>>;
	readonly cache: number;
	readonly cacheSlots: number;
	/** The lane's table slot (layout/table-format.ts) when its module reads a pattern, else null. */
	readonly tables: number | null;
	/** Its tables' row stride in bytes (layout/table-format.ts `rowBytes`); 0 with no tables. */
	readonly rowBytes: number;
	/** Lambda input port → its own math cache. */
	readonly lambdas: Readonly<Record<string, LambdaMemory>>;
}

export interface LambdaMemory {
	readonly cache: number;
	readonly cacheSlots: number;
}

export interface NodeMemory {
	readonly outs: Readonly<Record<string, number>>;
	/** Reducer input port → its f64 view. */
	readonly views: Readonly<Record<string, number>>;
	/** Port group name → its f64 array, one slot per member, shared by the node's lanes. */
	readonly groups: Readonly<Record<string, number>>;
	readonly lanes: readonly LaneMemory[];
}

export interface WasmLayout {
	readonly pages: number;
	readonly outL: number;
	readonly outR: number;
	readonly cur: number;
	/** The sample count (f64): lambda time is (count + k) / sampleRate. */
	readonly count: number;
	readonly size: number;
	/** The live slots (f64 each, Program.liveSlots order): the host writes them between renders. */
	readonly slots: number;
	readonly slotCount: number;
	readonly nodes: readonly NodeMemory[];
	/** The monitor region (runtime/live/monitor-region.ts); null when not monitored. */
	readonly monitor: MonitorMemory | null;
	/** Each display node's buffer/head addresses (display-list.ts order). */
	readonly displays: readonly DisplayMemory[];
	/** Where the table heap starts. */
	readonly heap: number;
}

export interface MonitorMemory {
	/** The region's byte address. */
	readonly at: number;
	readonly watches: number;
}

/** One display node's field names (ModuleSpec.display), to resolve against its built lanes. */
export interface DisplayPlan {
	readonly node: number;
	readonly buffer: string;
	readonly head: string;
}

/** A display's buffer (byte offset, f32 length) and head (f64 word index), per lane. */
export interface DisplayMemory {
	readonly lanes: readonly { readonly buffer: number; readonly length: number; readonly head: number }[];
}

/** Words the layout's displays take in a posted frame (`[head, n, ...n floats]` per lane). */
export function displayWords(displays: readonly DisplayMemory[]): number {
	return displays.reduce((sum, d) => sum + d.lanes.reduce((s, l) => s + 2 + l.length, 0), 0);
}

export function planMemory(
	runs: readonly NodeRun[],
	readsPattern: readonly boolean[],
	irs: readonly ModuleIR[],
	plans: NodePlans,
	lambdas: LambdaSources,
	size: number,
	slotCount: number,
	monitorWatches: number | null = null,
	displayPlans: readonly DisplayPlan[] = [],
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
	const count = take(8);
	const slots = take(8 * slotCount);
	const nodes = runs.map((run, i) => {
		const outs = Object.fromEntries(run.outPorts.map((p) => [p, take(8)]));
		const views: Record<string, number> = {};
		for (const port of run.gathers?.ports ?? []) {
			if (port.view !== null) views[port.name] = take(8 * port.srcLanes);
		}
		const groups: Record<string, number> = {};
		for (const g of [...run.groups.ins, ...run.groups.outs]) groups[g.name] = take(8 * g.ports.length);
		const slots = moduleCacheSlots(irs[i] as ModuleIR);
		const fields = fieldRebinds(irs[i] as ModuleIR);
		const stride = readsPattern[i] ? rowBytes(recordColumns(run.config)) : 0;
		const lanes = run.states.map((state, l) => {
			const shape = laneShapeOf(state);
			return {
				shape,
				state: Object.fromEntries(numericFields(shape).map((f) => [f, take(8)])),
				aggregates: planAggregates(
					shape,
					{ fields, elements: laneElementRebinds(plans[i], l) },
					take,
				),
				cache: take(8 * slots),
				cacheSlots: slots,
				tables: readsPattern[i] ? take(SLOT_BYTES) : null,
				rowBytes: stride,
				lambdas: planLambdas(lambdas[i]?.[l] ?? {}, take),
			};
		});
		return { outs, views, groups, lanes };
	});
	const monitor =
		monitorWatches === null
			? null
			: { at: take(8 * regionWords(monitorWatches)), watches: monitorWatches };
	const displays = displayPlans.map((plan) => resolveDisplay(plan, nodes[plan.node] as NodeMemory));
	const heap = top;
	const pages = Math.max(1, Math.ceil((heap + initialHeap(nodes)) / PAGE));
	return { pages, outL, outR, cur, count, size, slots, slotCount, nodes, monitor, displays, heap };
}

/** A display's buffer/head addresses, per lane, already placed by its node's own build. */
function resolveDisplay(plan: DisplayPlan, node: NodeMemory): DisplayMemory {
	const lanes = node.lanes.map((lane) => {
		const field = lane.aggregates[plan.buffer];
		if (field === undefined || field.shape.k !== "array")
			throw new Error(`wasm: display buffer '${plan.buffer}' is not a typed-array state field`);
		const head = lane.state[plan.head];
		if (head === undefined)
			throw new Error(`wasm: display head '${plan.head}' is not a numeric state field`);
		return { buffer: field.offset, length: field.shape.length, head };
	});
	return { lanes };
}

const NO_REBINDS: ReadonlySet<string> = new Set();

/** The arrays of records whose elements lane `l`'s plan rebinds; none for a node with no plans. */
function laneElementRebinds(
	plans: readonly FunctionPlan[] | undefined,
	l: number,
): ReadonlySet<string> {
	const plan = plans?.[l];
	return plan === undefined ? NO_REBINDS : elementRebinds(plan);
}

/** Two tables of the initial size per table lane. */
function initialHeap(nodes: readonly NodeMemory[]): number {
	const lanes = nodes.flatMap((node) => node.lanes).filter((lane) => lane.tables !== null);
	return lanes.reduce((bytes, lane) => bytes + 2 * tableBytes(INITIAL_ROWS, lane.rowBytes), 0);
}

/**
 * The engine's numeric fields count: `__rng` (the stream position), `__seed`,
 * `__lane`. A boolean has no memory form (state-layout.ts).
 */
function numericFields(state: RecordState): string[] {
	return Object.keys(state.fields).filter((f) => state.fields[f]?.k === "number");
}

/** The math cache the tick and helpers share: their slots are numbered across all of them. */
function moduleCacheSlots(ir: ModuleIR): number {
	return cacheSlotsIn([ir.tick.node, ...[...ir.helpers.values()].map((fn) => fn.node)]);
}

/** Each lambda input's own math cache. */
function planLambdas(
	lambdas: Readonly<Record<string, LambdaSource>>,
	take: (bytes: number) => number,
): Record<string, LambdaMemory> {
	const out: Record<string, LambdaMemory> = {};
	for (const [port, src] of Object.entries(lambdas)) {
		const cacheSlots = src.bound.slots;
		out[port] = { cache: take(8 * cacheSlots), cacheSlots };
	}
	return out;
}
