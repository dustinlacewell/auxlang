/**
 * The monitor's steps in the render function, for a monitored program
 * (runtime/live/monitor-plan.ts), the same steps as the reference
 * (runtime/live/interpreted-monitor.ts), bit for bit. The region
 * (runtime/live/monitor-region.ts) sits in memory; its frame, onset count
 * and level words are render locals like the state (render-locals.ts), so
 * a sample's level summary is a few f64 ops per watch:
 *
 *   before the walk   each reader's held note id into a local
 *   after the walk    each watch: hits += (last < 0.5 & x >= 0.5); last = x;
 *                     min, max, peak; each reader: an onset when its held
 *                     note id changed to a note and the row under it has a
 *                     site (a load from its table's site column), stored
 *                     while the frame has room; then frame += 1
 */

import { NO_NOTE } from "../../pattern/table/event-table";
import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	ONSET_CAPACITY,
	ONSET_FRAME,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
} from "../../runtime/live/live-contract";
import {
	type MonitorPlan,
	type MonitorTarget,
	READER_NOTE,
	READER_ROW,
} from "../../runtime/live/monitor-plan";
import {
	REGION_FRAME,
	REGION_LEVELS,
	REGION_ONSETS,
	onsetsStart,
} from "../../runtime/live/monitor-region";
import type { FnEmitter } from "../compile/fn-emitter";
import { OP } from "../encode/opcodes";
import { SLOT_CUR, TABLE_HEADER, recordFieldOffset } from "../layout/table-format";
import type { LaneMemory, MonitorMemory, WasmLayout } from "./memory-layout";
import type { RenderLocals } from "./render-locals";
import type { ValueSlots } from "./value-slots";

/** A reader's lane 0 as the onset step reads it. */
interface Reader {
	readonly watch: number;
	readonly target: MonitorTarget;
	readonly lane: LaneMemory;
	/** The held note id before the walk. */
	readonly held: number;
}

export class MonitorEmitter {
	private readonly region: MonitorMemory;
	private readonly readers: readonly Reader[];
	private readonly site: number;
	private readonly entry: number;

	constructor(
		private readonly e: FnEmitter,
		private readonly plan: MonitorPlan,
		layout: WasmLayout,
		private readonly locals: RenderLocals,
		private readonly slots: ValueSlots,
	) {
		if (layout.monitor === null) throw new Error("wasm: a monitor plan with no monitor region");
		this.region = layout.monitor;
		this.readers = plan.targets.flatMap((target, watch) =>
			target.reader < 0
				? []
				: [{ watch, target, lane: readerLane(layout, target.reader), held: e.local("f64") }],
		);
		this.site = e.local("f64");
		this.entry = e.local("int");
	}

	/** Before the walk: each reader's held note id. */
	before(): void {
		for (const r of this.readers) this.e.code.get(this.state(r, READER_NOTE)).set(r.held);
	}

	/** After the walk: the level summaries, the onsets, the next frame. */
	after(): void {
		this.plan.targets.forEach((t, w) => this.level(w, this.slots.current(t.slot)));
		for (const r of this.readers) this.onset(r);
		const frame = this.word(REGION_FRAME);
		this.e.code.get(frame).f64Const(1).op(OP.f64Add).set(frame);
	}

	private level(w: number, x: number): void {
		const c = this.e.code;
		const at = (field: number) => this.word(REGION_LEVELS + w * LEVEL_STRIDE + field);
		const [last, min, max, peak, hits] = [LEVEL_LAST, LEVEL_MIN, LEVEL_MAX, LEVEL_PEAK, LEVEL_HITS].map(at) as [
			number,
			number,
			number,
			number,
			number,
		];
		c.get(hits).get(last).f64Const(0.5).op(OP.f64Lt);
		c.get(x).f64Const(0.5).op(OP.f64Ge, OP.i32And, OP.f64ConvertI32U, OP.f64Add).set(hits);
		c.get(x).set(last);
		c.get(min).get(x).op(OP.f64Min).set(min);
		c.get(max).get(x).op(OP.f64Max).set(max);
		c.get(peak).get(x).op(OP.f64Abs, OP.f64Max).set(peak);
	}

	private onset(r: Reader): void {
		const { e } = this;
		const c = e.code;
		const note = this.state(r, READER_NOTE);
		const count = this.word(REGION_ONSETS);
		c.get(note).get(r.held).op(OP.f64Ne);
		c.get(note).f64Const(NO_NOTE).op(OP.f64Ne, OP.i32And);
		e.enter(OP.if);
		this.loadSite(r);
		c.set(this.site);
		c.get(this.site).f64Const(0).op(OP.f64Ge);
		c.get(count).f64Const(ONSET_CAPACITY).op(OP.f64Lt, OP.i32And);
		e.enter(OP.if);
		this.storeOnset(r.watch, count);
		e.exit();
		e.exit();
	}

	/** The site of the row under the reader: its `cur` table's site column. */
	private loadSite(r: Reader): void {
		const tables = r.lane.tables;
		if (tables === null) throw new Error(`wasm: monitor reader node ${r.target.reader} has no tables`);
		const c = this.e.code;
		c.i32Const(0).memory(OP.i32Load, 2, tables + SLOT_CUR);
		c.get(this.state(r, READER_ROW)).truncSatF64S();
		c.i32Const(r.lane.rowBytes).op(OP.i32Mul, OP.i32Add);
		c.loadF64(TABLE_HEADER + recordFieldOffset(r.target.siteColumn));
	}

	private storeOnset(watch: number, count: number): void {
		const c = this.e.code;
		const base = this.region.at + 8 * onsetsStart(this.region.watches);
		c.get(count).truncSatF64S().i32Const(8 * ONSET_STRIDE).op(OP.i32Mul).set(this.entry);
		c.get(this.entry).f64Const(watch).storeF64(base + 8 * ONSET_WATCH);
		c.get(this.entry).get(this.site).storeF64(base + 8 * ONSET_SITE);
		c.get(this.entry).get(this.word(REGION_FRAME)).storeF64(base + 8 * ONSET_FRAME);
		c.get(count).f64Const(1).op(OP.f64Add).set(count);
	}

	/** The local mirroring region word `k`. */
	private word(k: number): number {
		return this.locals.at(this.region.at + 8 * k);
	}

	/** The local mirroring a reader's lane-0 state field. */
	private state(r: Reader, field: string): number {
		const addr = r.lane.state[field];
		if (addr === undefined) throw new Error(`wasm: monitor reader has no state field '${field}'`);
		return this.locals.at(addr);
	}
}

function readerLane(layout: WasmLayout, node: number): LaneMemory {
	const lane = layout.nodes[node]?.lanes[0];
	if (lane === undefined) throw new Error(`wasm: no lane 0 memory for monitor reader node ${node}`);
	return lane;
}
