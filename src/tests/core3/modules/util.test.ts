import { describe, expect, it } from "vitest";

import { abs } from "@/core3/modules/abs";
import { add } from "@/core3/modules/add";
import { clip } from "@/core3/modules/clip";
import { eq, gt, lt } from "@/core3/modules/cmp";
import { div } from "@/core3/modules/div";
import { mod } from "@/core3/modules/mod";
import { mul, vca } from "@/core3/modules/mul";
import { pan } from "@/core3/modules/pan";
import { sah } from "@/core3/modules/sah";
import { scale } from "@/core3/modules/scale";
import { slew } from "@/core3/modules/slew";
import { sub } from "@/core3/modules/sub";
import { z1 } from "@/core3/modules/z1";
import { SR, driver } from "./helpers";

describe("z1", () => {
	it("emits the previous sample's input (one-sample delay)", () => {
		const d = driver(z1);
		expect(d.step({ in: 5 }).out).toBe(0); // first: prev=0
		expect(d.step({ in: 9 }).out).toBe(5);
		expect(d.step({ in: 2 }).out).toBe(9);
		expect(d.step({ in: 0 }).out).toBe(2);
	});
});

describe("mul / vca", () => {
	it("multiplies two signals", () => {
		expect(driver(mul).step({ in: 3, by: 4 }).out).toBe(12);
		expect(driver(mul).step({ in: 0.5, by: 0.5 }).out).toBe(0.25);
	});
	it("vca is the same op", () => {
		expect(driver(vca).step({ in: 3, by: 4 }).out).toBe(12);
	});
});

describe("add / sub / div", () => {
	it("add sums", () => {
		expect(driver(add).step({ in: 2, to: 5 }).out).toBe(7);
	});
	it("sub computes from - in", () => {
		expect(driver(sub).step({ in: 3, from: 10 }).out).toBe(7);
	});
	it("div divides, guards divide-by-zero", () => {
		expect(driver(div).step({ in: 10, by: 4 }).out).toBe(2.5);
		expect(driver(div).step({ in: 10, by: 0 }).out).toBe(0);
	});
});

describe("mod", () => {
	it("remainder, guards mod-by-zero", () => {
		expect(driver(mod).step({ in: 7, by: 3 }).out).toBe(1);
		expect(driver(mod).step({ in: 7, by: 0 }).out).toBe(0);
	});
});

describe("abs", () => {
	it("absolute value", () => {
		expect(driver(abs).step({ in: -3 }).out).toBe(3);
		expect(driver(abs).step({ in: 4 }).out).toBe(4);
	});
});

describe("clip", () => {
	it("clamps to [min, max]", () => {
		expect(driver(clip).step({ in: 5, min: -1, max: 1 }).out).toBe(1);
		expect(driver(clip).step({ in: -5, min: -1, max: 1 }).out).toBe(-1);
		expect(driver(clip).step({ in: 0.3, min: -1, max: 1 }).out).toBe(0.3);
	});
});

describe("cmp (gt/lt/eq)", () => {
	it("gt", () => {
		expect(driver(gt).step({ in: 2, than: 1 }).out).toBe(1);
		expect(driver(gt).step({ in: 1, than: 2 }).out).toBe(0);
	});
	it("lt", () => {
		expect(driver(lt).step({ in: 1, than: 2 }).out).toBe(1);
		expect(driver(lt).step({ in: 2, than: 1 }).out).toBe(0);
	});
	it("eq within tolerance", () => {
		expect(driver(eq).step({ in: 1, than: 1 }).out).toBe(1);
		expect(driver(eq).step({ in: 1, than: 1.5 }).out).toBe(0);
	});
});

describe("scale", () => {
	it("maps [from,to] onto [min,max]", () => {
		// default from/to = [-1,1], min/max = [0,1]
		expect(driver(scale).step({ in: -1 }).out).toBeCloseTo(0, 9);
		expect(driver(scale).step({ in: 1 }).out).toBeCloseTo(1, 9);
		expect(driver(scale).step({ in: 0 }).out).toBeCloseTo(0.5, 9);
	});
	it("custom range", () => {
		expect(driver(scale).step({ in: 0, from: 0, to: 10, min: 100, max: 200 }).out).toBe(100);
		expect(driver(scale).step({ in: 5, from: 0, to: 10, min: 100, max: 200 }).out).toBe(150);
	});
	it("zero span → 0 norm (no NaN)", () => {
		const r = driver(scale).step({ in: 5, from: 3, to: 3, min: 0, max: 1 }).out;
		expect(Number.isFinite(r)).toBe(true);
	});
});

describe("clip / cmp are stateless (no state fn)", () => {
	it("clip has no state", () => expect(clip.state).toBeUndefined());
});

describe("slew", () => {
	it("initializes to the first input (no glide from 0)", () => {
		const d = driver(slew);
		expect(d.step({ in: 0.5, rise: 0.1, fall: 0.1 }).out).toBe(0.5);
	});
	it("rises toward a target over rise seconds", () => {
		const d = driver(slew);
		d.step({ in: 0, rise: 0.1, fall: 0.1 }); // init at 0
		// step up to 1 with rise 0.1s → per-sample step 1/(0.1*sr)
		const mid = d.run(Math.round(0.05 * SR), { in: 1, rise: 0.1, fall: 0.1 }).out;
		expect(mid).toBeGreaterThan(0.3);
		expect(mid).toBeLessThan(0.7);
		const done = d.run(Math.round(0.1 * SR), { in: 1, rise: 0.1, fall: 0.1 }).out;
		expect(done).toBeCloseTo(1, 3);
	});
	it("falls toward a lower target over fall seconds", () => {
		const d = driver(slew);
		d.step({ in: 1, rise: 0.1, fall: 0.1 });
		const done = d.run(Math.round(0.15 * SR), { in: 0, rise: 0.1, fall: 0.1 }).out;
		expect(done).toBeCloseTo(0, 3);
	});
	it("zero rise time snaps instantly", () => {
		const d = driver(slew);
		d.step({ in: 0, rise: 0, fall: 0 });
		expect(d.step({ in: 1, rise: 0, fall: 0 }).out).toBe(1);
	});
});

describe("sah", () => {
	it("latches input on trig, holds otherwise", () => {
		const d = driver(sah);
		d.step({ in: 0.3, trig: 1 }); // latch 0.3 (also inits held to 0.3)
		expect(d.step({ in: 0.9, trig: 0 }).out).toBe(0.3); // holds
		expect(d.step({ in: 0.9, trig: 1 }).out).toBe(0.9); // relatch
		expect(d.step({ in: 0.1, trig: 0 }).out).toBe(0.9); // holds
	});
});

describe("pan", () => {
	it("center → equal l/r", () => {
		const o = driver(pan).step({ in: 1, pos: 0 });
		expect(o.l).toBeCloseTo(o.r, 9);
	});
	it("hard left → all in l", () => {
		const o = driver(pan).step({ in: 1, pos: -1 });
		expect(o.l).toBeCloseTo(1, 6);
		expect(o.r).toBeCloseTo(0, 6);
	});
	it("hard right → all in r", () => {
		const o = driver(pan).step({ in: 1, pos: 1 });
		expect(o.r).toBeCloseTo(1, 6);
		expect(o.l).toBeCloseTo(0, 6);
	});
	it("constant power: l²+r² invariant across the sweep", () => {
		let ref = -1;
		for (let pos = -1; pos <= 1; pos += 0.1) {
			const o = driver(pan).step({ in: 1, pos });
			const p = o.l * o.l + o.r * o.r;
			if (ref < 0) ref = p;
			expect(p).toBeCloseTo(ref, 5);
		}
	});
});
