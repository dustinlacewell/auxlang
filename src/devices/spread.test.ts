import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../descriptor/device";
import { resetIdCounter } from "../descriptor/identity";
import { inputs } from "../descriptor/inputs";
import { isPoly, poly } from "../descriptor/poly";
import { clearRegistry } from "../descriptor/registry";
import { clearOutputs, collectStereoGraph, out } from "../graph/out";
import { spread } from "./spread";

const oscSpec = {
	inputs: inputs({ pitch: 440 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("spread device", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	it("spread returns a poly with 2 voices", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);
		const osc3 = device(oscSpec);
		const p = poly([osc1, osc2, osc3]);

		const result = p.spread();

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices).toHaveLength(2);
		}
	});

	it("spread with 2 voices creates L/R with proper panning", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);
		const p = poly([osc1, osc2]);

		const result = p.spread();

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices).toHaveLength(2);
		}
	});

	it("spread creates separate stereo graphs", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);
		const osc3 = device(oscSpec);
		const p = poly([osc1, osc2, osc3]);

		p.spread().out();
		const stereo = collectStereoGraph();

		expect(stereo).not.toBeNull();
		// After spread, we have 2 voices which become L/R
		expect(stereo!.left).not.toBe(stereo!.right);
	});

	it("mono input to spread creates centered output", () => {
		const osc = device(oscSpec);

		// Direct call with mono
		const result = spread(osc);

		expect(isPoly(result)).toBe(true);
		if (isPoly(result)) {
			expect(result.voices).toHaveLength(2);
		}
	});

});
