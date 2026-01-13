/**
 * Tests for poly expansion pass - expands array inputs into multiple nodes.
 */

import { describe, it, expect } from "vitest";
import { expandPoly } from "../../core2/graph/expand-poly";
import type { FlatGraph } from "../../core2/graph/flat-graph";

describe("expandPoly", () => {
	describe("no expansion needed", () => {
		it("returns graph unchanged when no arrays", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} },
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "lpf1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			expect(expanded.nodes).toHaveLength(3);
			// Mono output goes to both L and R
			expect(expanded.leftOutputIds).toEqual(["out1"]);
			expect(expanded.rightOutputIds).toEqual(["out1"]);
		});
	});

	describe("array expansion", () => {
		it("expands node with array input into multiple nodes", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const sawNodes = expanded.nodes.filter((n) => n.device === "saw");
			expect(sawNodes).toHaveLength(2);
			expect(sawNodes[0]!.inputs.freq).toBe(440);
			expect(sawNodes[1]!.inputs.freq).toBe(550);
		});

		it("uses voice suffix in ids", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const sawNodes = expanded.nodes.filter((n) => n.device === "saw");
			expect(sawNodes[0]!.id).toBe("saw1.0");
			expect(sawNodes[1]!.id).toBe("saw1.1");
		});

		it("distributes out voices L/R round-robin", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			// 2 voices: voice 0 -> L, voice 1 -> R
			expect(expanded.leftOutputIds).toContain("out1.0");
			expect(expanded.rightOutputIds).toContain("out1.1");
		});
	});

	describe("downstream propagation", () => {
		it("expands downstream nodes that depend on poly source", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "lpf1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			// 2 saws + 2 lpfs + 2 outs
			expect(expanded.nodes).toHaveLength(6);
		});

		it("updates references in downstream nodes", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "lpf1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const lpf0 = expanded.nodes.find((n) => n.id === "lpf1.0");
			const lpf1 = expanded.nodes.find((n) => n.id === "lpf1.1");

			expect(lpf0?.inputs.input).toEqual({ ref: "saw1.0", out: "audio" });
			expect(lpf1?.inputs.input).toEqual({ ref: "saw1.1", out: "audio" });
		});

		it("broadcasts scalar inputs to all voices", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "lpf1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const lpf0 = expanded.nodes.find((n) => n.id === "lpf1.0");
			const lpf1 = expanded.nodes.find((n) => n.id === "lpf1.1");

			expect(lpf0?.inputs.cutoff).toBe(800);
			expect(lpf1?.inputs.cutoff).toBe(800);
		});
	});

	describe("array wraparound", () => {
		it("wraps shorter arrays to match voice count", () => {
			const graph: FlatGraph = {
				nodes: [
					{
						id: "saw1",
						device: "saw",
						inputs: { freq: [440, 550, 660] },
						config: {},
					},
					{
						id: "gain1",
						device: "gain",
						inputs: { input: { ref: "saw1", out: "audio" }, level: [0.5, 0.8] },
						config: {},
					},
					{ id: "out1", device: "out", inputs: { input: { ref: "gain1", out: "signal" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const gain0 = expanded.nodes.find((n) => n.id === "gain1.0");
			const gain1 = expanded.nodes.find((n) => n.id === "gain1.1");
			const gain2 = expanded.nodes.find((n) => n.id === "gain1.2");

			expect(gain0?.inputs.level).toBe(0.5);
			expect(gain1?.inputs.level).toBe(0.8);
			expect(gain2?.inputs.level).toBe(0.5); // wraps around
		});
	});

	describe("multiple poly sources", () => {
		it("handles multiple independent poly sources", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} },
					{ id: "saw2", device: "saw", inputs: { freq: [660, 770] }, config: {} },
					{ id: "out2", device: "out", inputs: { input: { ref: "saw2", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			// 2 saw1 + 2 out1 + 2 saw2 + 2 out2 = 8
			expect(expanded.nodes).toHaveLength(8);
		});
	});

	describe("non-poly nodes unchanged", () => {
		it("keeps nodes without poly inputs unchanged", () => {
			const graph: FlatGraph = {
				nodes: [
					{ id: "lfo1", device: "lfo", inputs: { rate: 2 }, config: {} },
					{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} },
					{ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} },
				],
			};

			const expanded = expandPoly(graph);
			const lfo = expanded.nodes.find((n) => n.id === "lfo1");
			expect(lfo).toBeDefined();
			expect(lfo?.id).toBe("lfo1"); // unchanged, no suffix
		});
	});
});
