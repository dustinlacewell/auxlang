/**
 * tempo(bpm) is a setting (MANIFESTO §6): it sets the ambient clock when eval
 * finishes, so its place in the code does not matter, and a second call is a
 * loud error. clock(bpm) makes an extra clock and never sets the ambient one.
 */

import "@/engine/library/all";
import { clock, runEval, runProgram, seq, tempo } from "@/engine/api";
import { describe, expect, it } from "vitest";

const bpmOf = (program: ReturnType<typeof runProgram>, module: string) => {
	const node = program.nodes.find((n) => n.module === module);
	const src = node?.lanes[0]?.bpm;
	return src?.k === "c" ? src.v : undefined;
};

describe("tempo()", () => {
	it("returns the ambient clock", () => {
		let returned: unknown;
		const result = runEval(() => {
			returned = tempo(100);
		});
		expect(result.clock).not.toBeNull();
		expect(returned).toBeDefined();
	});

	it("placed after out() still sets the tempo", () => {
		const program = runProgram(() => {
			seq("c4 e4").tri().out();
			tempo(97);
		});
		expect(bpmOf(program, "clock")).toBe(97);
		const si = program.nodes.findIndex((n) => n.module === "seq");
		expect(program.nodes[si]?.config.clocked).toBe(1);
	});

	it("twice in one patch is a loud error", () => {
		expect(() =>
			runEval(() => {
				tempo(120);
				tempo(90);
			}),
		).toThrow(/tempo\(\) is a setting and may appear once/);
	});

	it("clock() does not set the ambient clock", () => {
		expect(() =>
			runProgram(() => {
				clock(120);
				seq("c4 e4").tri().out();
			}),
		).toThrow(/seq has no clock — set one with tempo\(bpm\)/);
	});
});
