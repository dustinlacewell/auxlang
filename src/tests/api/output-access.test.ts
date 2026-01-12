/**
 * Output Access Tests
 * Tests: default/named output access, invalid names, ChainableOutput behavior
 */

import { beforeEach, describe, expect, it } from "vitest";
import * as api from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { clearRegistry } from "../../descriptor/registry";

const { saw, seq, clock } = api;

describe("Output Access", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	describe("default output access", () => {
		it("saw.audio returns OutputRef", () => {
			const s = saw(440);
			expect(isOutputRef(s.audio)).toBe(true);
		});
	});

	describe("named output access", () => {
		it("seq.gate returns gate output", () => {
			const s = seq("c4").clk(clock(120));
			if (isDescriptor(s)) {
				expect(isOutputRef(s.gate)).toBe(true);
				expect(s.gate.outputName).toBe("gate");
			}
		});

		it("seq.trig returns trigger output", () => {
			const s = seq("c4").clk(clock(120));
			if (isDescriptor(s)) {
				expect(isOutputRef(s.trig)).toBe(true);
				expect(s.trig.outputName).toBe("trig");
			}
		});
	});

	describe("invalid output name", () => {
		it("saw.bogus returns OutputRef (validation deferred)", () => {
			const s = saw(440);
			const ref = (s as unknown as Record<string, unknown>).bogus;
			expect(isOutputRef(ref)).toBe(true);
		});
	});

	describe("ChainableOutput behavior", () => {
		it("output is function and OutputRef", () => {
			const s = saw(440);
			expect(typeof s.audio).toBe("function");
			expect(isOutputRef(s.audio)).toBe(true);
			expect(typeof s.audio.descriptorId).toBe("string");
		});
	});
});
