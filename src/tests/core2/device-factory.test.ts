/**
 * Tests for device factory - creates device functions that produce nodes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { device } from "../../core2/device/device";
import { resetBuilder, getBuilder } from "../../core2/graph/graph-builder";

describe("device factory", () => {
	beforeEach(() => {
		resetBuilder();
	});

	describe("basic device creation", () => {
		it("creates a device factory function", () => {
			const saw = device("saw", {
				inputs: { freq: 440 },
				outputs: ["audio"],
				defaultInput: "freq",
				defaultOutput: "audio",
				process: () => ({ audio: 0 }),
			});

			expect(typeof saw).toBe("function");
		});

		it("calling factory produces a node in the graph", () => {
			const saw = device("saw", {
				inputs: { freq: 440 },
				outputs: ["audio"],
				defaultInput: "freq",
				defaultOutput: "audio",
				process: () => ({ audio: 0 }),
			});

			saw(440);

			const graph = getBuilder().build();
			expect(graph.nodes).toHaveLength(1);
			expect(graph.nodes[0].device).toBe("saw");
			expect(graph.nodes[0].inputs.freq).toBe(440);
		});

		it("each call creates a new node with unique id", () => {
			const saw = device("saw", {
				inputs: { freq: 440 },
				outputs: ["audio"],
				defaultInput: "freq",
				defaultOutput: "audio",
				process: () => ({ audio: 0 }),
			});

			saw(440);
			saw(550);

			const graph = getBuilder().build();
			expect(graph.nodes).toHaveLength(2);
			expect(graph.nodes[0].id).not.toBe(graph.nodes[1].id);
		});
	});

	describe("positional arguments", () => {
		it("consumes positional args in order", () => {
			const lpf = device("lpf", {
				inputs: { input: 0, cutoff: 1000, resonance: 0 },
				outputs: ["audio"],
				defaultInput: "input",
				defaultOutput: "audio",
				positionalArgs: ["cutoff", "resonance"],
				process: () => ({ audio: 0 }),
			});

			lpf(800, 0.5);

			const graph = getBuilder().build();
			expect(graph.nodes[0].inputs.cutoff).toBe(800);
			expect(graph.nodes[0].inputs.resonance).toBe(0.5);
		});

		it("accepts object params", () => {
			const lpf = device("lpf", {
				inputs: { input: 0, cutoff: 1000, resonance: 0 },
				outputs: ["audio"],
				defaultInput: "input",
				defaultOutput: "audio",
				positionalArgs: ["cutoff", "resonance"],
				process: () => ({ audio: 0 }),
			});

			lpf({ cutoff: 800, resonance: 0.5 });

			const graph = getBuilder().build();
			expect(graph.nodes[0].inputs.cutoff).toBe(800);
			expect(graph.nodes[0].inputs.resonance).toBe(0.5);
		});
	});

	describe("input setters", () => {
		it("returns chainable with input setter methods", () => {
			const saw = device("saw", {
				inputs: { freq: 440, detune: 0 },
				outputs: ["audio"],
				defaultInput: "freq",
				defaultOutput: "audio",
				process: () => ({ audio: 0 }),
			});

			const s = saw(440);
			const s2 = s.detune(5);

			const graph = getBuilder().build();
			// Two nodes: original and one with detune set
			expect(graph.nodes).toHaveLength(2);
			expect(graph.nodes[1].inputs.detune).toBe(5);
		});
	});

	describe("output access", () => {
		it("provides output refs via property access", () => {
			const saw = device("saw", {
				inputs: { freq: 440 },
				outputs: ["audio"],
				defaultInput: "freq",
				defaultOutput: "audio",
				process: () => ({ audio: 0 }),
			});

			const s = saw(440);
			const ref = s.audio;

			expect(ref).toEqual({ ref: s.id, out: "audio" });
		});
	});
});
