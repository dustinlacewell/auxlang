import "@/core3/modules/all";

import { getModule } from "@/core3/module/define";
import { classifyOutput } from "@/ui/core3-editor/live-display/classify-output";
import { describe, expect, it } from "vitest";

describe("classifyOutput", () => {
	it("a gate/trig port (seq.gate, seq.trig) is trig", () => {
		const seq = getModule("seq");
		expect(classifyOutput(seq, "gate")).toBe("trig");
		expect(classifyOutput(seq, "trig")).toBe("trig");
	});

	it("a bipolar control (lfo) is bipolar, by name — not audio despite category sources", () => {
		const lfo = getModule("lfo");
		expect(classifyOutput(lfo, "out")).toBe("bipolar");
	});

	it("a unipolar 0..1 control (envelope) is unipolar", () => {
		const adsr = getModule("adsr");
		expect(classifyOutput(adsr, "out")).toBe("unipolar");
	});

	it("an audio-rate oscillator (sin) is audio", () => {
		const sin = getModule("sin");
		expect(classifyOutput(sin, "out")).toBe("audio");
	});
});
