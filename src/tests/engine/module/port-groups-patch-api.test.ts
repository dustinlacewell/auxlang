/**
 * Port groups through the real patch API: a defmod's tick TEXT (not a JS
 * closure) goes through the front end (module/front) and specialises on the
 * interpreter — `i.ch.length` folds, `i.ch[k]`/`i.level[k]` read the members,
 * `.mod` on a member really modulates, and an out-group's `o.g[k] = v` taps
 * by member name.
 */

import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { getRegistry } from "@/engine/module/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { renderTap } from "@/engine/runtime/render";
import { nodeIndex } from "../bridge/helpers";
import { evalInternal } from "../fixtures/internal-module";

const MIX_TICK =
	"let sum = 0; for (let k = 0; k < i.ch.length; k++) sum += i.ch[k] * i.level[k]; o.out = sum;";

function defMix(): string {
	return [
		"const gmix = defineInternalModule({",
		'  name: "gmix",',
		'  category: "utils",',
		'  ins: { ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },',
		"  outs: { out: sig(0) },",
		'  defaultIn: "ch",',
		'  defaultOut: "out",',
		"  tick: (s, i, o, c) => {",
		`    ${MIX_TICK}`,
		"  },",
		"})",
	].join("\n");
}

describe("port groups through the patch API", () => {
	it("sums ch[k]*level[k] with a real tick: level.a defaults to 1", () => {
		const code = [defMix(), "gmix({ a: 0.5, b: 0.25 }).level({ b: 2 }).out()"].join("\n");
		const program = evalInternal(code);
		expect(renderTap(program, nodeIndex(program, "gmix"), "out", 0, 1)[0]).toBeCloseTo(1, 5);
	});

	it(".mod on a member level really modulates the output", () => {
		const code = [
			defMix(),
			'const m = gmix({ a: 1, b: 1 }).mod("level.b", lfo(0.3, -1, 1), 1)',
			"m.out()",
		].join("\n");
		const program = evalInternal(code);
		const gmixNode = nodeIndex(program, "gmix");
		const lfoNode = nodeIndex(program, "lfo");
		const engine = new Core3Engine(program, 48000, withProgramSpecs(getRegistry(), program));
		const frame = new Float32Array(2);
		for (let n = 0; n < 24000; n++) {
			engine.tick(frame);
			const wave = engine.peek(lfoNode, "out", 0);
			expect(engine.peek(gmixNode, "out", 0)).toBeCloseTo(1 + (1 + wave) * 1, 9);
		}
	});

	it("an out-group member taps by name through the patch API", () => {
		const code = [
			"const gfan = defineInternalModule({",
			'  name: "gfan",',
			'  category: "utils",',
			"  ins: { ch: group(sig(0), { open: true }) },",
			"  outs: { g: group(sig(0), { open: true }) },",
			'  defaultIn: "ch",',
			"  tick: (s, i, o, c) => {",
			"    for (let k = 0; k < i.ch.length; k++) o.g[k] = i.ch[k] * 2;",
			"  },",
			"})",
			"gfan({ ch: { a: 3, b: 5 }, g: ['a', 'b'] }).a.out()",
		].join("\n");
		const program = evalInternal(code);
		const i = nodeIndex(program, "gfan");
		expect(renderTap(program, i, "a", 0, 1)[0]).toBeCloseTo(6, 5);
		expect(renderTap(program, i, "b", 0, 1)[0]).toBeCloseTo(10, 5);
	});
});
