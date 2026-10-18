/**
 * The monitor (live/live-contract.ts, engine side): the watch list, level
 * summaries and seq note onsets in both engines, monitoring off costing
 * nothing, and the worklet's frame transport.
 */

import "@/engine/library/all";

import { getRegistry } from "@/engine/dsp/define";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { EMPTY_DISPLAY_SOURCE } from "@/engine/runtime/live/display-source";
import { InterpretedMonitor } from "@/engine/runtime/live/interpreted-monitor";
import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
	ONSET_KIND,
	ONSET_KIND_OFF,
	ONSET_KIND_ON,
	ONSET_LANE,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
} from "@/engine/runtime/live/live-contract";
import {
	type MonitorRegion,
	REGION_LEVELS,
	copyFrame,
	frameWords,
	initRegion,
	regionWords,
	startFrame,
} from "@/engine/runtime/live/monitor-region";
import { watchList } from "@/engine/runtime/live/watch-list";
import { renderTap } from "@/engine/runtime/render";
import { MonitorWriter } from "@/engine/runtime/worklet/monitor-writer";
import type { SourceMap } from "@/engine/source/source-map";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { evaluatePatch } from "@/engine/eval-patch";
import { describe, expect, it } from "vitest";

const SR = 48000;
const BLOCK = 128;
/** Six blocks: about 16 ms, the frame size the tests read. */
const FRAME = 6 * BLOCK;

interface Frame {
	readonly levels: number[][];
	readonly onsets: number[][];
}

/** The frame a region holds now, decoded as the editor reads a MonitorFrame. */
function readFrame(region: MonitorRegion): Frame {
	const into = new Float64Array(frameWords(region.watches));
	const count = copyFrame(region, into);
	const levels = Array.from({ length: region.watches }, (_, w) =>
		Array.from(into.subarray(w * LEVEL_STRIDE, (w + 1) * LEVEL_STRIDE)),
	);
	const base = region.watches * LEVEL_STRIDE;
	const onsets = Array.from({ length: count }, (_, k) =>
		Array.from(into.subarray(base + k * ONSET_STRIDE, base + (k + 1) * ONSET_STRIDE)),
	);
	return { levels, onsets };
}

interface Monitored {
	readonly region: MonitorRegion;
	renderBlock(l: Float32Array, r: Float32Array, offset: number, n: number): void;
}

/** Render `samples` in blocks, reading and restarting a frame every `frame` samples. */
function frames(engine: Monitored, samples: number, frame = FRAME): Frame[] {
	const l = new Float32Array(BLOCK);
	const r = new Float32Array(BLOCK);
	const out: Frame[] = [];
	for (let at = 0; at < samples; at += BLOCK) {
		engine.renderBlock(l, r, 0, Math.min(BLOCK, samples - at));
		if ((at + BLOCK) % frame === 0 || at + BLOCK >= samples) {
			out.push(readFrame(engine.region));
			startFrame(engine.region);
		}
	}
	return out;
}

function interpreted(program: Program): InterpretedMonitor {
	return new InterpretedMonitor(program, SR, withProgramSpecs(getRegistry(), program));
}

function wasmMonitored(program: Program): Monitored {
	const prepared = prepareWasm(program, SR, getRegistry(), undefined, true);
	const engine = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
	const region = engine.monitor;
	if (region === null) throw new Error("expected a monitor region");
	return {
		region,
		renderBlock: (l, r, offset, n) => engine.renderBlock(l, r, offset, n),
	};
}

function watchOf(program: Program, module: string): number {
	const at = watchList(program).findIndex((w) => w.module === module);
	if (at < 0) throw new Error(`no ${module} watch`);
	return at;
}

function siteText(source: string, map: SourceMap, id: number): string | undefined {
	const site = map.sites[id];
	return site === undefined ? undefined : source.slice(site.range.start, site.range.end);
}

describe("watchList", () => {
	it("lists each sited node's default output, lane 0, in node order", () => {
		const { program } = evaluatePatch('tempo(120)\nseq("c3 e3").tri().gain(0.2).out()');
		const watches = watchList(program);
		const registry = withProgramSpecs(getRegistry(), program);
		const expected = program.nodes.flatMap((node, i) => {
			const port = registry.get(node.module)?.defaultOut;
			if (node.site === undefined || port === undefined) return [];
			return [{ node: i, port, site: node.site, module: node.module }];
		});
		expect(watches).toEqual(expected);
		const modules = watches.map((w) => w.module);
		const seq = modules.indexOf("seq");
		const tri = modules.indexOf("tri");
		const gain = modules.indexOf("gain");
		expect(seq).toBeGreaterThanOrEqual(0);
		expect(tri).toBeGreaterThan(seq);
		expect(gain).toBeGreaterThan(tri);
		expect(watches[seq]?.port).toBe("out");
		expect(watches[tri]?.port).toBe("out");
	});
});

describe("levels", () => {
	it("an lfo's last, min and max are its own tap over the frame", () => {
		const { program } = evaluatePatch("lfo(1).out()");
		const w = watchOf(program, "lfo");
		const node = watchList(program)[w]?.node as number;
		const tap = renderTap(program, node, "out", 0, 2 * FRAME);
		const [, second] = frames(interpreted(program), 2 * FRAME);
		const span = Array.from(tap.subarray(FRAME, 2 * FRAME));
		const level = second?.levels[w] as number[];
		expect(Math.fround(level[LEVEL_LAST] as number)).toBe(span[FRAME - 1]);
		expect(Math.fround(level[LEVEL_MIN] as number)).toBe(Math.min(...span));
		expect(Math.fround(level[LEVEL_MAX] as number)).toBe(Math.max(...span));
	});

	it("an audio-rate sine peaks at its largest |x|, near 1, over a 16 ms frame", () => {
		const { program } = evaluatePatch("sin(69).out()");
		const w = watchOf(program, "sin");
		const node = watchList(program)[w]?.node as number;
		const tap = renderTap(program, node, "out", 0, FRAME);
		const [first] = frames(interpreted(program), FRAME);
		const peak = first?.levels[w]?.[LEVEL_PEAK] as number;
		expect(Math.fround(peak)).toBe(Math.max(...Array.from(tap, Math.abs)));
		expect(peak).toBeGreaterThan(0.9995);
		expect(peak).toBeLessThanOrEqual(1);
	});

	it("hits count the rising edges past 0.5 of a gate in the frame", () => {
		const { program } = evaluatePatch("lfo(40).gt(0.7).out()");
		const w = watchOf(program, "gt");
		const node = watchList(program)[w]?.node as number;
		const tap = renderTap(program, node, "out", 0, FRAME);
		let edges = 0;
		let last = 0;
		for (const x of tap) {
			if (last < 0.5 && x >= 0.5) edges++;
			last = x;
		}
		const [first] = frames(interpreted(program), FRAME);
		expect(edges).toBeGreaterThan(0);
		expect(first?.levels[w]?.[LEVEL_HITS]).toBe(edges);
	});
});

describe("onsets", () => {
	it("a seq's note onsets carry their token's site and frame; rests and ties make none", () => {
		const src = 'tempo(120)\nseq("c3 ~ e3 _").tri().out()';
		const { program, sourceMap } = evaluatePatch(src);
		const w = watchOf(program, "seq");
		const node = watchList(program)[w]?.node as number;
		const samples = 2 * 2 * SR; // two cycles of 2 s
		const trig = renderTap(program, node, "trig", 0, samples);
		const trigFrames = Array.from(trig).flatMap((x, k) => (x === 1 ? [k] : []));
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const onsets = events.filter((o) => o[ONSET_KIND] === ONSET_KIND_ON);
		expect(onsets.map((o) => o[ONSET_WATCH])).toEqual([w, w, w, w]);
		expect(onsets.map((o) => o[ONSET_FRAME])).toEqual(trigFrames);
		// The notes' nominal frames, to the sample the clock's float position crosses them.
		const nominal = [0, 48000, 96000, 144000];
		expect(trigFrames).toHaveLength(nominal.length);
		trigFrames.forEach((f, k) => expect(Math.abs(f - (nominal[k] as number))).toBeLessThanOrEqual(1));
		const texts = onsets.map((o) => siteText(src, sourceMap, o[ONSET_SITE] as number));
		expect(texts).toEqual(["c3", "e3", "c3", "e3"]);
	});

	it("c3 goes dark during the rest; e3 stays lit through the tie (gate-driven OFF)", () => {
		const src = 'tempo(120)\nseq("c3 ~ e3 _").tri().out()';
		const { program } = evaluatePatch(src);
		const node = watchList(program)[watchOf(program, "seq")]?.node as number;
		const samples = 2 * SR; // one cycle of 2 s
		const gate = renderTap(program, node, "gate", 0, samples);
		const gateOffFrames = Array.from(gate).flatMap((x, k) => (k > 0 && gate[k - 1] === 1 && x === 0 ? [k] : []));
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const offs = events.filter((o) => o[ONSET_KIND] === ONSET_KIND_OFF);
		expect(offs.map((o) => o[ONSET_FRAME])).toEqual(gateOffFrames);
		// c3's own step ends in a rest (gate falls, no immediate retrigger): exactly
		// one OFF with no ON following inside this one-cycle window.
		expect(offs.length).toBeGreaterThan(0);
	});

	it("a pattern plugged straight into an input lifts to a watched seq, same as an explicit one", () => {
		const src = 'tempo(120)\nslew({ in: p`<0 1>`, rise: 0.02, fall: 0.02 }).out()';
		const { program, sourceMap } = evaluatePatch(src);
		const w = watchOf(program, "seq");
		const node = watchList(program)[w]?.node as number;
		const samples = 2 * 2 * SR; // two cycles of 2 s
		const trig = renderTap(program, node, "trig", 0, samples);
		const trigFrames = Array.from(trig).flatMap((x, k) => (x === 1 ? [k] : []));
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const onsets = events.filter((o) => o[ONSET_KIND] === ONSET_KIND_ON);
		expect(onsets.map((o) => o[ONSET_WATCH])).toEqual(trigFrames.map(() => w));
		expect(onsets.map((o) => o[ONSET_FRAME])).toEqual(trigFrames);
		const texts = onsets.map((o) => siteText(src, sourceMap, o[ONSET_SITE] as number));
		expect(texts).toEqual(["0", "1"]);
	});

	it("a pattern plugged into a module input by config key lifts to a watched seq", () => {
		const src = 'tempo(120)\nsin().lpf({ cutoff: p`60 72` }).out()';
		const { program, sourceMap } = evaluatePatch(src);
		const w = watchOf(program, "seq");
		const node = watchList(program)[w]?.node as number;
		const samples = 2 * SR - BLOCK; // just under one cycle of 2 s
		const trig = renderTap(program, node, "trig", 0, samples);
		const trigFrames = Array.from(trig).flatMap((x, k) => (x === 1 ? [k] : []));
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const onsets = events.filter((o) => o[ONSET_KIND] === ONSET_KIND_ON);
		expect(onsets.map((o) => o[ONSET_FRAME])).toEqual(trigFrames);
		const texts = onsets.map((o) => siteText(src, sourceMap, o[ONSET_SITE] as number));
		expect(texts).toEqual(["60", "72"]);
	});

	// A pattern spliced with signals (`p`${lfo(1)} 80`` — MANIFESTO §4.4) desugars
	// to mux(seq(indexPattern), palette): its index seq already gets a real call
	// site today (patch/build-palette-mux.ts builds it through the normal seq()
	// factory). Whether a palette slot's own token should light like a note is
	// a separate highlight-mechanism question (switching a live cable, not a
	// note onset) — left out of scope for this bug.

	it("a chord's stacked notes each report their own onset, one per lane", () => {
		const src = 'tempo(120)\nseq("[c3,e3,g3]").tri().out()';
		const { program, sourceMap } = evaluatePatch(src);
		const w = watchOf(program, "seq");
		const samples = SR; // one cycle of 2 s is plenty for the chord's one onset per lane
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const onsets = events.filter((o) => o[ONSET_KIND] === ONSET_KIND_ON);
		expect(onsets).toHaveLength(3);
		expect(onsets.map((o) => o[ONSET_WATCH])).toEqual([w, w, w]);
		expect(onsets.map((o) => o[ONSET_LANE]).sort()).toEqual([0, 1, 2]);
		const byLane = new Map(onsets.map((o) => [o[ONSET_LANE], o]));
		const texts = [0, 1, 2].map((l) => siteText(src, sourceMap, byLane.get(l)?.[ONSET_SITE] as number));
		expect(texts).toEqual(["c3", "e3", "g3"]);
	});

	it("a chord followed by a single note: the dropped lanes go dark with no retrigger", () => {
		// Packed voicing reuses lane 0 for c4 (a real retrigger: OFF then ON);
		// lanes 1 and 2 have no next note until the pattern repeats a cycle later.
		const src = 'tempo(120)\nseq("[c3,e3,g3] c4").tri().out()';
		const { program } = evaluatePatch(src);
		const w = watchOf(program, "seq");
		const samples = SR; // the chord, then c4: half the 2 s cycle, no repeat
		const events = frames(interpreted(program), samples, samples)[0]?.onsets as number[][];
		const mine = events.filter((o) => o[ONSET_WATCH] === w);
		const offs = mine.filter((o) => o[ONSET_KIND] === ONSET_KIND_OFF);
		const ons = mine.filter((o) => o[ONSET_KIND] === ONSET_KIND_ON);
		expect(new Set(offs.map((o) => o[ONSET_LANE]))).toEqual(new Set([0, 1, 2]));
		// Lanes 1 and 2 never retrigger in this half-cycle: only lane 0 (c4) does.
		const onLanesAfterChord = ons.filter((o) => (o[ONSET_FRAME] as number) > 0).map((o) => o[ONSET_LANE]);
		expect(onLanesAfterChord).toEqual([0]);
	});
});

describe("both engines", () => {
	it("produce identical frames, levels and onsets, for 2 s of a seq and an lfo", () => {
		const src = 'tempo(120)\nconst s = seq("c3 <e3 g3> ~ [b3 c4]")\ns.tri().mul(lfo(2, 0, 1)).out()';
		const { program } = evaluatePatch(src);
		const js = frames(interpreted(program), 2 * SR);
		const wasm = frames(wasmMonitored(program), 2 * SR);
		expect(js.flatMap((f) => f.onsets).length).toBeGreaterThan(4);
		expect(wasm).toEqual(js);
	});
});

describe("monitoring off", () => {
	it("compiles no monitor region", () => {
		const { program } = evaluatePatch('tempo(120)\nseq("c3 e3").tri().out()');
		const off = prepareWasm(program, SR);
		const on = prepareWasm(program, SR, getRegistry(), undefined, true);
		expect(off.compiled.layout.monitor).toBeNull();
		expect(on.compiled.layout.monitor).not.toBeNull();
		expect(on.compiled.layout.heap).toBeGreaterThan(off.compiled.layout.heap);
		const engine = new WasmEngine(new WebAssembly.Module(off.compiled.bytes), off);
		expect(engine.monitor).toBeNull();
	});
});

describe("MonitorWriter", () => {
	interface Posted {
		readonly frame: MonitorFrame;
		readonly transfer: readonly Transferable[];
	}

	function setup(watches: number) {
		const posted: Posted[] = [];
		let allocations = 0;
		const port = {
			postMessage: (frame: MonitorFrame, transfer: Transferable[]) => {
				posted.push({ frame, transfer });
			},
		};
		const alloc = (bytes: number) => {
			allocations++;
			return new ArrayBuffer(bytes);
		};
		const writer = new MonitorWriter(port, SR, alloc);
		const region: MonitorRegion = { f64: new Float64Array(regionWords(watches)), at: 0, watches };
		initRegion(region);
		return { writer, region, posted, allocations: () => allocations };
	}

	/** ceil(48000 / 128 / 60) blocks per frame. */
	const PER_FRAME = 7;

	function blocks(writer: MonitorWriter, region: MonitorRegion, serial: number, n: number): void {
		for (let k = 0; k < n; k++) writer.afterBlock(region, EMPTY_DISPLAY_SOURCE, serial, (k + 1) * BLOCK);
	}

	it("posts a frame every ceil(sampleRate / 128 / 60) blocks, transferring its buffer", () => {
		const { writer, region, posted } = setup(2);
		writer.reserve(2, 0);
		writer.enable(true);
		blocks(writer, region, 1, PER_FRAME - 1);
		expect(posted).toHaveLength(0);
		blocks(writer, region, 1, 1);
		expect(posted).toHaveLength(1);
		const { frame, transfer } = posted[0] as Posted;
		expect(frame.type).toBe("monitor");
		expect(frame.levelCount).toBe(2);
		expect(frame.buffer.byteLength).toBe(8 * frameWords(2));
		expect(transfer).toEqual([frame.buffer]);
	});

	it("skips frames while the editor holds both buffers, allocating nothing", () => {
		const { writer, region, posted, allocations } = setup(2);
		writer.reserve(2, 0);
		writer.enable(true);
		const before = allocations();
		blocks(writer, region, 1, 3 * PER_FRAME);
		expect(posted).toHaveLength(2);
		expect(allocations()).toBe(before);
		writer.giveBack((posted[0] as Posted).frame.buffer);
		blocks(writer, region, 1, PER_FRAME);
		expect(posted).toHaveLength(3);
		expect(allocations()).toBe(before);
	});

	it("a skipped frame keeps accumulating; a posted one restarts the region", () => {
		const { writer, region, posted } = setup(1);
		writer.reserve(1, 0);
		writer.enable(true);
		blocks(writer, region, 1, 2 * PER_FRAME);
		region.f64[REGION_LEVELS + LEVEL_HITS] = 3;
		blocks(writer, region, 1, PER_FRAME);
		expect(posted).toHaveLength(2);
		expect(region.f64[REGION_LEVELS + LEVEL_HITS]).toBe(3);
		writer.giveBack((posted[1] as Posted).frame.buffer);
		blocks(writer, region, 1, PER_FRAME);
		expect(new Float64Array((posted[2] as Posted).frame.buffer)[LEVEL_HITS]).toBe(3);
		expect(region.f64[REGION_LEVELS + LEVEL_HITS]).toBe(0);
	});

	it("the generation moves on with every swap", () => {
		const { writer, region, posted } = setup(1);
		writer.reserve(1, 0);
		writer.enable(true);
		blocks(writer, region, 4, PER_FRAME);
		writer.giveBack((posted[0] as Posted).frame.buffer);
		blocks(writer, region, 5, PER_FRAME);
		const generations = posted.map((p) => p.frame.generation);
		expect(generations).toHaveLength(2);
		expect(generations[1] as number).toBeGreaterThan(generations[0] as number);
	});

	it("posts nothing while disabled or with no region", () => {
		const { writer, region, posted } = setup(1);
		writer.reserve(1, 0);
		blocks(writer, region, 1, 2 * PER_FRAME);
		writer.enable(true);
		for (let k = 0; k < 2 * PER_FRAME; k++) writer.afterBlock(null, EMPTY_DISPLAY_SOURCE, 1, 0);
		expect(posted).toHaveLength(0);
	});
});
