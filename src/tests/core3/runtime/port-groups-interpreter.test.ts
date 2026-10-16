/**
 * Port groups on the interpreter engine (step 2b): a tick reads an in-group
 * as `i.g[k]` / `i.g.length`, writes an out-group as `o.g[k]`, and a loop
 * over `i.g.length` specialises without error. The checker (module/front/
 * rules/check-write.ts) refuses `o.g = v`, `o.plain[k] = v` and `i.g[k] = v`.
 * WASM still refuses any grouped node (step 2c).
 */

import { describe, expect, it } from "vitest";

import { getRegistry } from "@/core3/module/define";
import { defmod } from "@/core3/patch/defmod";
import { renderTap } from "@/core3/runtime/render";
import { group, sig, unit } from "@/core3/types";
import { prepareWasm } from "@/core3/wasm/host/prepare-wasm";
import { type IO, type St, c, n, pnode, prog } from "./helpers";

// gmix: out = sum ch[k] * level[k]. `ch` open in-group, `level` a `like: ch` in-group.
defmod({
	name: "pgi.mix",
	category: "utils",
	ins: { ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },
	outs: { out: sig() },
	defaultIn: "ch",
	defaultOut: "out",
	tick: (_s: St, i: IO, o: IO) => {
		const ch = i.ch as unknown as Float64Array;
		const level = i.level as unknown as Float64Array;
		let sum = 0;
		for (let k = 0; k < ch.length; k++) sum += (ch[k] as number) * (level[k] as number);
		o.out = sum;
	},
});

// pgi.fan: an out group, one member per in-group member, doubled.
defmod({
	name: "pgi.fan",
	category: "utils",
	ins: { ch: group(sig(0), { open: true }) },
	outs: { g: group(sig(), { open: true }) },
	defaultIn: "ch",
	tick: (_s: St, i: IO, o: IO) => {
		const ch = i.ch as unknown as Float64Array;
		const g = o.g as unknown as Float64Array;
		for (let k = 0; k < ch.length; k++) g[k] = (ch[k] as number) * 2;
	},
});

defmod({
	name: "pgi.tap",
	category: "utils",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s: St, i: IO, o: IO) => {
		o.out = i.in as number;
	},
});

describe("port groups on the interpreter", () => {
	it("sums ch[k]*level[k]: level.b = 2 renders the constant mix", () => {
		const program = prog([
			pnode("pgi.mix", [{ a: c(0.5), b: c(0.25), "level.a": c(1), "level.b": c(2) }], {
				groups: { ch: ["a", "b"] },
			}),
		]);
		expect(renderTap(program, 0, "out", 0, 1, getRegistry())[0]).toBeCloseTo(1, 6);
	});

	it(".mod on a member level changes the result", () => {
		const base = prog([
			pnode("pgi.mix", [{ a: c(1), b: c(1), "level.a": c(1), "level.b": c(1) }], {
				groups: { ch: ["a", "b"] },
			}),
		]);
		const raised = prog([
			pnode("pgi.mix", [{ a: c(1), b: c(1), "level.a": c(1), "level.b": c(3) }], {
				groups: { ch: ["a", "b"] },
			}),
		]);
		const before = renderTap(base, 0, "out", 0, 1, getRegistry())[0] as number;
		const after = renderTap(raised, 0, "out", 0, 1, getRegistry())[0] as number;
		expect(after).toBeGreaterThan(before);
	});

	it("an out-group member taps the doubled value", () => {
		const program = prog([
			pnode("pgi.fan", [{ a: c(3), b: c(5) }], { groups: { ch: ["a", "b"], g: ["a", "b"] } }),
			pnode("pgi.tap", [{ in: n(0, "a") }], { place: "tapA" }),
			pnode("pgi.tap", [{ in: n(0, "b") }], { place: "tapB" }),
		]);
		expect(renderTap(program, 1, "out", 0, 1, getRegistry())[0]).toBeCloseTo(6, 6);
		expect(renderTap(program, 2, "out", 0, 1, getRegistry())[0]).toBeCloseTo(10, 6);
	});

	it("WASM still refuses a grouped node", () => {
		const program = prog([
			pnode("pgi.mix", [{ a: c(1), "level.a": c(1) }], { groups: { ch: ["a"] } }),
		]);
		expect(() => prepareWasm(program, 48000)).toThrow(/port groups are not built yet/);
	});
});
