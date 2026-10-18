/**
 * Swap acknowledgements: the worklet host replies `swapped` with a program's
 * serial when it takes effect and `error` with its serial when its build
 * fails. The main thread's posted programs (runtime/posted-programs.ts)
 * follow the replies: a failed program is never the base of the next
 * prepare. Slot writes carry the serial of the program whose indices they
 * use; the host drops a write for a program that is neither playing nor
 * still to play.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { MonitorFrame } from "@/core3/runtime/live/live-contract";
import { PostedPrograms } from "@/core3/runtime/posted-programs";
import type { HostPrepared } from "@/core3/runtime/prepare/host-prepared";
import { prepareWasmProgram } from "@/core3/runtime/prepare/prepare-wasm-program";
import { LiveHost } from "@/core3/runtime/worklet/live-host";
import type { WorkletReply } from "@/core3/runtime/worklet/messages";
import { MonitorWriter } from "@/core3/runtime/worklet/monitor-writer";
import { displayWords } from "@/core3/wasm/program/memory-layout";
import { evaluatePatch } from "@/core3/eval-patch";
import { describe, expect, it } from "vitest";

const SR = 48000;
const BLOCK = 128;
const SLIDER = "sin(60).gain(slider(0.5, 0, 1)).out()";
const SLIDER_EDITED = "sin(60).gain(slider(0.6, 0, 1)).out()";

/** A valid module with no memory: the build's first touch of memory throws. */
const EMPTY_MODULE = new WebAssembly.Module(Uint8Array.of(0, 0x61, 0x73, 0x6d, 1, 0, 0, 0));

/** The same program with a module whose build fails on the worklet. */
const broken = (prepared: HostPrepared): HostPrepared => ({
	...prepared,
	wasm: { ...prepared.wasm, module: EMPTY_MODULE },
});

/** A worklet host whose replies feed the main thread's posted programs, as audio.ts wires them. */
class Rig {
	readonly replies: WorkletReply[] = [];
	readonly frames: MonitorFrame[] = [];
	readonly programs = new PostedPrograms();
	readonly l: number[] = [];
	readonly host = new LiveHost(
		SR,
		getRegistry(),
		(err, serial) => this.reply({ type: "error", serial, message: String(err) }),
		(serial) => this.reply({ type: "swapped", serial }),
	);
	private readonly writer = new MonitorWriter(
		{
			postMessage: (frame: MonitorFrame) => {
				this.frames.push({ ...frame, buffer: frame.buffer.slice(0) });
				this.writer.giveBack(frame.buffer);
			},
		},
		SR,
	);
	private frame = 0;

	/** `budget`: the build budget per block; `monitor`: prepare monitored. */
	constructor(
		private readonly budget = 50,
		private readonly monitor = false,
	) {
		this.writer.enable(monitor);
	}

	/** Prepare against the latest program posted and not failed, as audio.ts does. */
	async prepare(code: string): Promise<HostPrepared> {
		const { program } = evaluatePatch(code);
		const registry = withProgramSpecs(getRegistry(), program);
		const base = this.programs.latest;
		return prepareWasmProgram(program, registry, SR, base, this.budget, this.monitor);
	}

	post(prepared: HostPrepared): void {
		this.programs.posted(prepared);
		this.writer.reserve(prepared.wasm.layout.monitor?.watches ?? 0, displayWords(prepared.wasm.layout.displays));
		this.host.swap(prepared);
	}

	write(serial: number, slot: number, value: number): void {
		this.host.writeSlots(serial, Float64Array.of(slot, value));
	}

	/** Render until nothing is queued or building; returns the host sample it stopped at. */
	untilIdle(): number {
		do this.block();
		while (this.host.pending);
		return this.l.length;
	}

	blocks(count: number): void {
		for (let b = 0; b < count; b++) this.block();
	}

	/** The left peak over the last four blocks. */
	peak(): number {
		return Math.max(...this.l.slice(this.l.length - 4 * BLOCK));
	}

	private block(): void {
		const outL = new Float32Array(BLOCK);
		const outR = new Float32Array(BLOCK);
		this.host.render(outL, outR, BLOCK, this.frame);
		this.writer.afterBlock(this.host.monitor, this.host.displays, this.host.serial, this.frame + BLOCK);
		this.frame += BLOCK;
		this.l.push(...outL);
	}

	private reply(reply: WorkletReply): void {
		this.replies.push(reply);
		if (reply.type === "swapped") this.programs.swapped(reply.serial);
		if (reply.type === "error" && reply.serial !== undefined) this.programs.failed(reply.serial);
	}
}

describe("swap acknowledgements", () => {
	it("a failed build: its slot writes are dropped and the next prepare carries from the playing program", async () => {
		const rig = new Rig();
		const a = await rig.prepare(SLIDER);
		rig.post(a);
		rig.untilIdle();
		rig.write(a.wasm.serial, 0, 0.25);
		rig.blocks(20);
		expect(rig.peak()).toBeCloseTo(peakAt(0.25), 2);

		const b = await rig.prepare(SLIDER_EDITED);
		expect(b.wasm.carry?.from).toBe(a.wasm.serial);
		rig.post(broken(b));
		rig.untilIdle();
		expect(rig.replies).toContainEqual(
			expect.objectContaining({ type: "error", serial: b.wasm.serial }),
		);
		expect(rig.replies).not.toContainEqual({ type: "swapped", serial: b.wasm.serial });

		rig.write(b.wasm.serial, 0, 0.75);
		rig.blocks(20);
		expect(rig.peak(), "the old program keeps its slot value").toBeCloseTo(peakAt(0.25), 2);

		expect(rig.programs.latest).toBe(a);
		const c = await rig.prepare(SLIDER_EDITED);
		expect(c.wasm.carry?.from).toBe(a.wasm.serial);
	}, 20_000);

	it("a normal swap replies swapped with its serial; writes tagged with it apply", async () => {
		const rig = new Rig();
		const a = await rig.prepare(SLIDER);
		rig.post(a);
		expect(rig.programs.latest).toBe(a);
		rig.untilIdle();
		expect(rig.replies).toEqual([{ type: "swapped", serial: a.wasm.serial }]);
		expect(rig.programs.playing).toBe(a);
		rig.write(a.wasm.serial, 0, 0.25);
		rig.blocks(20);
		expect(rig.peak()).toBeCloseTo(peakAt(0.25), 2);
	}, 20_000);

	it("a write tagged with the building program lands after its swap, not on the old engine", async () => {
		const rig = new Rig();
		const a = await rig.prepare(SLIDER);
		rig.post(a);
		rig.untilIdle();
		rig.write(a.wasm.serial, 0, 0.25);
		rig.blocks(20);

		const b = await rig.prepare(SLIDER_EDITED);
		rig.post(b);
		rig.blocks(1);
		expect(rig.host.pending).toBe(true);
		rig.write(b.wasm.serial, 0, 0.75);
		const swap = rig.untilIdle() - BLOCK;
		const before = Math.max(...rig.l.slice(swap - 4 * BLOCK, swap));
		expect(before, "the playing program keeps its value while the new one builds").toBeCloseTo(
			peakAt(0.25),
			2,
		);
		expect(rig.replies).toContainEqual({ type: "swapped", serial: b.wasm.serial });
		rig.blocks(60);
		expect(rig.peak()).toBeCloseTo(peakAt(0.75), 2);
	}, 20_000);

	it("monitor frames after a failed build carry the playing program's serial", async () => {
		const code = 'tempo(120)\nseq("c3 ~ e3 _").tri().out()';
		const rig = new Rig(1e9, true);
		const a = await rig.prepare(code);
		rig.post(a);
		rig.untilIdle();
		rig.blocks(20);
		const b = await rig.prepare(code.replace("e3", "g3"));
		rig.post(broken(b));
		rig.untilIdle();
		const after = rig.frames.length;
		rig.blocks(60);
		const later = rig.frames.slice(after);
		expect(later.length).toBeGreaterThan(0);
		expect(later.every((f) => f.generation === a.wasm.serial)).toBe(true);
	}, 20_000);
});

/** The settled left peak of `sin(60).gain(gain).out()` (out's own level included). */
function peakAt(gain: number): number {
	const { program } = evaluatePatch(`sin(60).gain(${gain}).out()`);
	const engine = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const l = new Float32Array(4000);
	const r = new Float32Array(4000);
	engine.renderBlock(l, r, 0, 4000);
	return Math.max(...l.slice(2000));
}
