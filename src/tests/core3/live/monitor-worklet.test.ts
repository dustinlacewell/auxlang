/**
 * The monitor through the worklet host: a monitored program swapped into a
 * LiveHost posts frames, through the MonitorWriter, whose onsets sit on the
 * AudioContext frame clock and whose generation is the program's serial.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import {
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
	ONSET_KIND,
	ONSET_KIND_OFF,
	ONSET_KIND_ON,
	ONSET_SITE,
	ONSET_STRIDE,
} from "@/core3/runtime/live/live-contract";
import { prepareWasmProgram } from "@/core3/runtime/prepare/prepare-wasm-program";
import { LiveHost } from "@/core3/runtime/worklet/live-host";
import { MonitorWriter } from "@/core3/runtime/worklet/monitor-writer";
import { displayWords } from "@/core3/wasm/program/memory-layout";
import { evaluatePatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";

const SR = 48000;
const BLOCK = 128;
/** Where the AudioContext's frame clock stands when the program arrives. */
const START = 1_000_000;

describe("monitor through the worklet host", () => {
	it("posts onsets on the context's frame clock, generation = the program's serial", async () => {
		const src = 'tempo(120)\nseq("c3 ~ e3 _").tri().out()';
		const { program, sourceMap } = evaluatePatch(src);
		const registry = withProgramSpecs(getRegistry(), program);
		const prepared = await prepareWasmProgram(program, registry, SR, undefined, 1e9, true);
		const host = new LiveHost(SR, getRegistry(), (err) => {
			throw err;
		});
		// Each frame is read at once and its buffer replaced by a copy, as the editor hands one back.
		const posted: MonitorFrame[] = [];
		const writer = new MonitorWriter(
			{
				postMessage: (frame: MonitorFrame) => {
					posted.push({ ...frame, buffer: frame.buffer.slice(0) });
					writer.giveBack(frame.buffer);
				},
			},
			SR,
		);
		writer.reserve(prepared.wasm.layout.monitor?.watches ?? 0, displayWords(prepared.wasm.layout.displays));
		writer.enable(true);
		host.swap(prepared);
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		let frame = START;
		let swapped = -1;
		while (frame < START + 3 * SR) {
			host.render(l, r, BLOCK, frame);
			if (swapped < 0 && host.monitor !== null) swapped = frame;
			writer.afterBlock(host.monitor, host.displays, host.serial, frame + BLOCK);
			frame += BLOCK;
		}
		expect(swapped).toBeGreaterThan(START);
		expect(posted.every((f) => f.generation === prepared.wasm.serial)).toBe(true);
		const events = posted.flatMap((f) => {
			const words = new Float64Array(f.buffer);
			const base = f.levelCount * LEVEL_STRIDE;
			return Array.from({ length: f.onsetCount }, (_, k) => [
				words[base + k * ONSET_STRIDE + ONSET_FRAME] as number,
				words[base + k * ONSET_STRIDE + ONSET_SITE] as number,
				words[base + k * ONSET_STRIDE + ONSET_KIND] as number,
			]);
		});
		const onsets = events.filter(([, , kind]) => kind === ONSET_KIND_ON);
		const offs = events.filter(([, , kind]) => kind === ONSET_KIND_OFF);
		const site = (id: number) => {
			const at = sourceMap.sites[id]?.range;
			return at === undefined ? undefined : src.slice(at.start, at.end);
		};
		// 3 s at 120 bpm: c3 at 0 s, e3 at 1 s, c3 at 2 s after the swap.
		expect(onsets.map(([, s]) => site(s as number))).toEqual(["c3", "e3", "c3"]);
		expect(onsets[0]?.[0]).toBe(swapped);
		onsets.forEach(([f], k) =>
			expect(Math.abs((f as number) - (swapped + k * SR))).toBeLessThanOrEqual(1),
		);
		// c3 at 0 s goes dark before the rest; e3 at 1 s stays lit through its tie
		// (one OFF, not two) until it in turn goes dark before the next c3.
		expect(offs.length).toBeGreaterThanOrEqual(2);
	}, 20_000);
});
