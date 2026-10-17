/**
 * The reference monitor: the interpreter engine (engine.ts) built for the
 * monitored program (monitored-program.ts), run a sample at a time with the
 * monitor's steps (monitor-plan.ts) around each sample, into its own region
 * (monitor-region.ts). The WASM engine's monitor (wasm/program/emit-monitor.ts)
 * must match it bit for bit. For tests and reference only: the worklet runs
 * WASM.
 */

import { laneTable } from "../../bridge/lane-table";
import { NO_NOTE } from "../../pattern/table/event-table";
import type { Program, Registry } from "../../types";
import { EngineBuild } from "../build/engine-build";
import type { EngineParts } from "../engine-parts";
import { LiveEngine } from "../live-engine";
import type { NodeRun } from "../node-run";
import { prepareProgram } from "../prepare/prepare-program";
import { specialiseNodes } from "../specialise/specialise-nodes";
import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	ONSET_CAPACITY,
	ONSET_FRAME,
	ONSET_KIND,
	ONSET_KIND_OFF,
	ONSET_KIND_ON,
	ONSET_LANE,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
	type Watch,
} from "./live-contract";
import { type MonitorPlan, type MonitorTarget, monitorPlan } from "./monitor-plan";
import {
	type MonitorRegion,
	REGION_FRAME,
	REGION_LEVELS,
	REGION_ONSETS,
	initRegion,
	onsetsStart,
	regionWords,
} from "./monitor-region";
import { watchList } from "./watch-list";

export class InterpretedMonitor {
	readonly watches: readonly Watch[];
	readonly region: MonitorRegion;
	private readonly engine: LiveEngine;
	private readonly parts: EngineParts;
	private readonly plan: MonitorPlan;
	/** Each target's reader's held note id before the sample, one per (watch, lane). */
	private readonly held: Float64Array[];
	/** Each target's reader's held gate before the sample, one per (watch, lane). */
	private readonly heldGate: Float64Array[];

	/** `registry`: the base registry with the program's specs. */
	constructor(program: Program, sampleRate: number, registry: Registry) {
		const prepared = prepareProgram(program, registry, sampleRate, undefined, true);
		const build = new EngineBuild(prepared, registry, undefined);
		this.parts = build.finish();
		specialiseNodes(this.parts.runs, build.nodeSpecs, sampleRate);
		this.engine = new LiveEngine(this.parts);
		this.watches = watchList(prepared.program, registry);
		this.plan = monitorPlan(this.watches, this.parts.runs, this.parts.layout);
		this.held = this.plan.targets.map((t) => new Float64Array(t.laneCount));
		this.heldGate = this.plan.targets.map((t) => new Float64Array(t.laneCount));
		this.region = { f64: new Float64Array(regionWords(this.watches.length)), at: 0, watches: this.watches.length };
		initRegion(this.region);
	}

	/** Advance `n` samples, a sample at a time, monitoring each. */
	renderBlock(outL: Float32Array, outR: Float32Array, offset: number, n: number): void {
		for (let k = 0; k < n; k++) {
			this.before();
			this.engine.renderBlock(outL, outR, offset + k, 1);
			this.after();
		}
	}

	private before(): void {
		this.plan.targets.forEach((t, w) => {
			if (t.reader < 0 || t.fields === null) return;
			for (let l = 0; l < t.laneCount; l++) {
				const state = this.readerState(t, l);
				(this.held[w] as Float64Array)[l] = state[t.fields.held] as number;
				(this.heldGate[w] as Float64Array)[l] = state[t.fields.gate] as number;
			}
		});
	}

	private after(): void {
		const cur = this.parts.bufs.cur;
		this.plan.targets.forEach((t, w) => levelStep(this.region, w, cur[t.slot] as number));
		this.plan.targets.forEach((t, w) => {
			if (t.reader < 0) return;
			for (let l = 0; l < t.laneCount; l++) {
				this.onStep(t, w, l);
				this.offStep(t, w, l);
			}
		});
		const { f64, at } = this.region;
		f64[at + REGION_FRAME] = (f64[at + REGION_FRAME] as number) + 1;
	}

	private onStep(t: MonitorTarget, w: number, l: number): void {
		if (t.fields === null) return;
		const state = this.readerState(t, l);
		const note = state[t.fields.held] as number;
		if (note === (this.held[w] as Float64Array)[l] || note === NO_NOTE) return;
		const column = laneTable(state).fields[t.siteColumn] as Float64Array;
		const site = column[state[t.fields.row] as number] as number;
		if (site >= 0) recordEvent(this.region, w, l, ONSET_KIND_ON, site);
	}

	private offStep(t: MonitorTarget, w: number, l: number): void {
		if (t.fields === null) return;
		const state = this.readerState(t, l);
		const gate = state[t.fields.gate] as number;
		if (gate === 1 || (this.heldGate[w] as Float64Array)[l] !== 1) return;
		recordEvent(this.region, w, l, ONSET_KIND_OFF, 0);
	}

	private readerState(t: MonitorTarget, l: number): Record<string, unknown> {
		return (this.parts.runs[t.reader] as NodeRun).states[l] as Record<string, unknown>;
	}
}

/** One sample of watch `w`'s level summary. */
function levelStep(region: MonitorRegion, w: number, x: number): void {
	const f64 = region.f64;
	const at = region.at + REGION_LEVELS + w * LEVEL_STRIDE;
	const last = f64[at + LEVEL_LAST] as number;
	f64[at + LEVEL_HITS] = (f64[at + LEVEL_HITS] as number) + (last < 0.5 && x >= 0.5 ? 1 : 0);
	f64[at + LEVEL_LAST] = x;
	f64[at + LEVEL_MIN] = Math.min(f64[at + LEVEL_MIN] as number, x);
	f64[at + LEVEL_MAX] = Math.max(f64[at + LEVEL_MAX] as number, x);
	f64[at + LEVEL_PEAK] = Math.max(f64[at + LEVEL_PEAK] as number, Math.abs(x));
}

/** An ON or OFF event of watch `w` lane `l` at the current frame, kept while the frame has room. */
function recordEvent(region: MonitorRegion, w: number, l: number, kind: number, site: number): void {
	const f64 = region.f64;
	const count = f64[region.at + REGION_ONSETS] as number;
	if (count >= ONSET_CAPACITY) return;
	const at = region.at + onsetsStart(region.watches) + count * ONSET_STRIDE;
	f64[at + ONSET_WATCH] = w;
	f64[at + ONSET_LANE] = l;
	f64[at + ONSET_KIND] = kind;
	f64[at + ONSET_SITE] = site;
	f64[at + ONSET_FRAME] = f64[region.at + REGION_FRAME] as number;
	f64[region.at + REGION_ONSETS] = count + 1;
}
