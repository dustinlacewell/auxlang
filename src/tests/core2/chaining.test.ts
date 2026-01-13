/**
 * Tests for device chaining - the fluent API.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { device } from "../../core2/device/device";
import { inputs } from "../../core2/device/inputs";
import { resetBuilder, getBuilder } from "../../core2/graph/graph-builder";

describe("device chaining", () => {
	let saw: ReturnType<typeof device>;
	let lpf: ReturnType<typeof device>;
	let gain: ReturnType<typeof device>;

	beforeEach(() => {
		resetBuilder();

		saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["audio"],
			defaultInput: "freq",
			defaultOutput: "audio",
			process: () => ({ audio: 0 }),
		});

		lpf = device("lpf", {
			inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
			outputs: ["audio"],
			defaultInput: "input",
			defaultOutput: "audio",
			positionalArgs: ["cutoff", "resonance"],
			process: () => ({ audio: 0 }),
		});

		gain = device("gain", {
			inputs: inputs({ input: 0, level: 1 }),
			outputs: ["audio"],
			defaultInput: "input",
			defaultOutput: "audio",
			positionalArgs: ["level"],
			process: () => ({ audio: 0 }),
		});
	});

	describe("basic chaining", () => {
		it("chains via default output to default input", () => {
			saw(440).lpf(800);

			const graph = getBuilder().build();
			expect(graph.nodes).toHaveLength(2);

			const lpfNode = graph.nodes.find((n) => n.device === "lpf");
			const sawNode = graph.nodes.find((n) => n.device === "saw");

			expect(lpfNode?.inputs.input).toEqual({ ref: sawNode?.id, out: "audio" });
			expect(lpfNode?.inputs.cutoff).toBe(800);
		});

		it("chains multiple devices", () => {
			saw(440).lpf(800).gain(0.5);

			const graph = getBuilder().build();
			expect(graph.nodes).toHaveLength(3);

			const gainNode = graph.nodes.find((n) => n.device === "gain");
			const lpfNode = graph.nodes.find((n) => n.device === "lpf");

			expect(gainNode?.inputs.input).toEqual({ ref: lpfNode?.id, out: "audio" });
		});
	});

	describe("explicit output chaining", () => {
		it("chains from explicit output", () => {
			const seq = device("seq", {
				inputs: inputs({ clk: 0 }),
				config: {},
				outputs: ["cv", "gate", "trig"],
				defaultInput: "clk",
				defaultOutput: "cv",
				process: () => ({ cv: 0, gate: 0, trig: 0 }),
			});

			const s = seq();
			s.cv.saw();

			const graph = getBuilder().build();
			const sawNode = graph.nodes.find((n) => n.device === "saw");
			expect(sawNode?.inputs.freq).toEqual({ ref: s.id, out: "cv" });
		});
	});

	describe("chaining with params object", () => {
		it("accepts params object while chaining", () => {
			saw(440).lpf({ cutoff: 800, resonance: 0.5 });

			const graph = getBuilder().build();
			const lpfNode = graph.nodes.find((n) => n.device === "lpf");
			expect(lpfNode?.inputs.cutoff).toBe(800);
			expect(lpfNode?.inputs.resonance).toBe(0.5);
		});

		it("rejects setting default input in params when chaining", () => {
			// When chaining, the default input is already bound to chain source
			expect(() => {
				saw(440).lpf({ input: 999, cutoff: 800 });
			}).toThrow();
		});
	});
});
