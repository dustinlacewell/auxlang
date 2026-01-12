/**
 * Terminal Output Tests
 * Tests: descriptor .out(), poly .out(), global out()
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { resetIdCounter } from "../../descriptor/identity";
import { clearOutputs, collectStereoGraph } from "../../graph/out";
import { clearRegistry } from "../../descriptor/registry";

const { saw, out } = api;

describe("Terminal Output", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	describe("descriptor out()", () => {
		it("saw(440).out() registers output", () => {
			saw(440).out();
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
		});
	});

	describe("poly out()", () => {
		it("poly.out() collects all voices", () => {
			saw([220, 330]).out();
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
		});
	});

	describe("global out()", () => {
		it("out(descriptor) works like .out()", () => {
			out(saw(440));
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
		});

		it("out(OutputRef) resolves to descriptor", () => {
			const s = saw(440);
			out(s.audio);
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
		});
	});

	describe("multiple outputs", () => {
		it("multiple .out() calls register multiple outputs", () => {
			saw(220).out();
			saw(440).out();
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
			// With 2 outputs, we get stereo distribution
			expect(stereo!.left.outputNodeId).not.toBe(stereo!.right.outputNodeId);
		});
	});

	describe("stereo distribution", () => {
		it("2 voices distribute to L/R", () => {
			saw([220, 440]).out();
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
			expect(stereo!.left.outputNodeId).not.toBe(stereo!.right.outputNodeId);
		});

		it("1 voice is mono (same L/R)", () => {
			saw(440).out();
			const stereo = collectStereoGraph();
			expect(stereo).not.toBeNull();
			expect(stereo!.left.outputNodeId).toBe(stereo!.right.outputNodeId);
		});
	});
});
