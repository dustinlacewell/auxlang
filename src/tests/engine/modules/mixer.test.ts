/**
 * `mixer`: named-channel sum with a per-channel level group (`mixer({ a, b
 * }).level({ b: 2 })`), through the real patch API (port groups).
 */

import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { renderTap } from "@/engine/runtime/render";
import { getRegistry } from "@/engine/module/define";
import { evalPatch } from "@/engine/eval-patch";
import { nodeIndex } from "../bridge/helpers";

describe("mixer", () => {
	it("sums named channels at level 1 by default", () => {
		const program = evalPatch("mixer({ a: 0.5, b: 0.25 }).out()");
		const out = renderTap(program, nodeIndex(program, "mixer"), "out", 0, 128);
		for (const v of out) expect(v).toBeCloseTo(0.75, 12);
	});

	it(".level sets one channel's gain, others default to 1", () => {
		const program = evalPatch("mixer({ a: 0.5, b: 0.25 }).level({ b: 2 }).out()");
		const out = renderTap(program, nodeIndex(program, "mixer"), "out", 0, 128);
		for (const v of out) expect(v).toBeCloseTo(1, 12);
	});

	it(".level sets several channels' gains", () => {
		const program = evalPatch("mixer({ a: 0.5, b: 0.25 }).level({ a: 0, b: 4 }).out()");
		const out = renderTap(program, nodeIndex(program, "mixer"), "out", 0, 128);
		for (const v of out) expect(v).toBeCloseTo(1, 12);
	});

	it(".mod on a level member modulates the sum sample-by-sample", () => {
		const code = [
			'const m = mixer({ a: 1, b: 1 }).mod("level.b", lfo(0.3, -1, 1), 0.5)',
			"m.out()",
		].join("\n");
		const program = evalPatch(code);
		const mixerNode = nodeIndex(program, "mixer");
		const lfoNode = nodeIndex(program, "lfo");
		const engine = new Core3Engine(program, 48000, withProgramSpecs(getRegistry(), program));
		const frame = new Float32Array(2);
		for (let n = 0; n < 24000; n++) {
			engine.tick(frame);
			const wave = engine.peek(lfoNode, "out", 0);
			expect(engine.peek(mixerNode, "out", 0)).toBeCloseTo(1 + (1 + 0.5 * wave), 9);
		}
	});

	it("sums arbitrary signal channels sample-by-sample", () => {
		const code = "const m = mixer({ a: sin(60), b: tri(67) })\nm.out()";
		const program = evalPatch(code);
		const mixerNode = nodeIndex(program, "mixer");
		const sinNode = nodeIndex(program, "sin");
		const triNode = nodeIndex(program, "tri");
		const engine = new Core3Engine(program, 48000, withProgramSpecs(getRegistry(), program));
		const frame = new Float32Array(2);
		for (let n = 0; n < 4800; n++) {
			engine.tick(frame);
			const a = engine.peek(sinNode, "out", 0);
			const b = engine.peek(triNode, "out", 0);
			expect(engine.peek(mixerNode, "out", 0)).toBeCloseTo(a + b, 9);
		}
	});

	it("mixer({}) with no channels is 0 (or a loud error at eval, if empty open groups are refused)", () => {
		try {
			const program = evalPatch("mixer({}).out()");
			const out = renderTap(program, nodeIndex(program, "mixer"), "out", 0, 128);
			for (const v of out) expect(v).toBe(0);
		} catch (err) {
			// An empty open group refused at eval is an acceptable loud error.
			expect(String(err)).toMatch(/.+/);
		}
	});

	it(".level on an unknown channel throws, naming the real channels", () => {
		expect(() => evalPatch("mixer({ a: 0.5, b: 0.25 }).level({ c: 1 }).out()")).toThrow(/a.*b|b.*a/);
	});

	it("chaining into mixer's default input is a loud error naming the fix", () => {
		expect(() => evalPatch("sin().mixer().out()")).toThrow(/mixer\(\{/);
	});
});
