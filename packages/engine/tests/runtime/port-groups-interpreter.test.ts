/**
 * Port groups on the interpreter engine (step 2b): a tick reads an in-group
 * as `i.g[k]` / `i.g.length`, writes an out-group as `o.g[k]`, and a loop
 * over `i.g.length` specialises without error. The checker (module/front/
 * rules/check-write.ts) refuses `o.g = v`, `o.plain[k] = v` and `i.g[k] = v`.
 */

import { describe, expect, it } from "vitest";

import { getRegistry } from "@/dsp/define";
import { defmod } from "@/patch/defmod";
import { renderTap } from "@/runtime/render";
import { group, sig, unit } from "@/types";
import { c, n, pnode, prog } from "./helpers";

// A setup function built from raw text (not a TS closure vitest's own
// transform would rewrite): a group default (`group(sig(0), { open: true })`)
// is text the lowering parses itself, and vitest's SSR transform rewrites a
// bare `group(...)` call into an import-wrapped expression the marker parser
// can't read as a plain name. `Function(...)` keeps the text untouched.
const setup = (setupText: string): (() => unknown) => new Function(`return ${setupText}`)() as () => unknown;

// gmix: out = sum ch[k] * level[k]. `ch` open in-group, `level` a `like: ch` in-group.
defmod(
	"pgi.mix",
	{},
	setup(`() => {
		return ({ ch = group(sig(0), { open: true }), level = group(unit(1), { like: "ch" }) }) => {
			let sum = 0;
			for (let k = 0; k < ch.length; k++) sum += ch[k] * level[k];
			return sum;
		};
	}`),
);

// pgi.fan: an out group, one member per in-group member, doubled.
defmod(
	"pgi.fan",
	{ outs: { g: group(sig(), { open: true }) } },
	setup(`() => {
		return ({ ch = group(sig(0), { open: true }) }, o) => {
			for (let k = 0; k < ch.length; k++) o.g[k] = ch[k] * 2;
		};
	}`),
);

defmod(
	"pgi.tap",
	{},
	setup(`() => {
		return ({ in: x = 0 }) => x;
	}`),
);

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
});
