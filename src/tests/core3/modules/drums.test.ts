import { describe, expect, it } from "vitest";

import { clap } from "@/core3/modules/drums/clap";
import { hihat } from "@/core3/modules/drums/hihat";
import { kick } from "@/core3/modules/drums/kick";
import { snare } from "@/core3/modules/drums/snare";
import type { ModuleSpec } from "@/core3/types";
import { SR, driver, maxAbs } from "./helpers";

const DRUMS: [string, ModuleSpec][] = [
	["kick", kick],
	["snare", snare],
	["hihat", hihat],
	["clap", clap],
];

/** Fire a single-sample trig, then run silence; return the full output trace. */
function hit(spec: ModuleSpec, samples: number): number[] {
	const d = driver(spec);
	const out: number[] = [];
	out.push(d.step({ trig: 1 }).out);
	for (let k = 1; k < samples; k++) out.push(d.step({ trig: 0 }).out);
	return out;
}

describe.each(DRUMS)("drum %s", (name, spec) => {
	it("is silent before any trigger", () => {
		const d = driver(spec);
		const xs = d.trace(500, "out", { trig: 0 });
		expect(maxAbs(xs)).toBeLessThan(1e-6);
	});

	it("produces sound when gate-triggered", () => {
		const xs = hit(spec, Math.round(0.1 * SR));
		expect(maxAbs(xs)).toBeGreaterThan(0.05);
	});

	it("output stays bounded", () => {
		const xs = hit(spec, Math.round(0.5 * SR));
		expect(maxAbs(xs)).toBeLessThan(3);
	});

	it("decays to near silence within a second", () => {
		const xs = hit(spec, Math.round(1.0 * SR));
		const tail = xs.slice(Math.floor(xs.length * 0.9));
		expect(maxAbs(tail)).toBeLessThan(0.05);
	});

	it("is deterministic across two identical hits (seeded noise)", () => {
		const a = hit(spec, 2000);
		const b = hit(spec, 2000);
		expect(a).toEqual(b);
	});

	it(`${name}: state() allocates the tables, tick allocates nothing new`, () => {
		// Snapshot state keys before and after a run; no new keys should appear
		// (a proxy for "no per-sample allocation of tables into state").
		const d = driver(spec);
		const keysBefore = Object.keys(d.state).sort();
		d.run(1000, { trig: 1 });
		const keysAfter = Object.keys(d.state).sort();
		expect(keysAfter).toEqual(keysBefore);
		// and no state value is an object/array (only primitives/typed arrays)
		for (const v of Object.values(d.state)) {
			expect(typeof v === "number" || ArrayBuffer.isView(v)).toBe(true);
		}
	});
});
