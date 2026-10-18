/**
 * `scope`: a display-declaring module (ModuleSpec.display) that always runs,
 * passes its input through, and accumulates a min/max waveform buffer.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { defmod, runEval } from "@/core3/api";
import { getModule } from "@/core3/module/define";
import { hydrateSpec, serializeSpec } from "@/core3/module/serialize";
import { renderTap } from "@/core3/runtime/render";
import { evalPatch } from "@/core3/eval-patch";
import { nodeIndex } from "../bridge/helpers";
import { SR, driver } from "./helpers";

describe("scope", () => {
	it("sin().scope() with no out() keeps the scope node in the compiled program", () => {
		const program = evalPatch("sin().scope()");
		expect(program.outs).toEqual([]);
		expect(program.nodes.some((n) => n.module === "scope")).toBe(true);
	});

	it("sin().scope().lpf(80).out() compiles, the scope node appears once, and the signal passes through unchanged", () => {
		const scoped = evalPatch("sin(57).scope().lpf(80).out()");
		const plain = evalPatch("sin(57).lpf(80).out()");
		expect(scoped.nodes.filter((n) => n.module === "scope")).toHaveLength(1);
		const scopedOut = renderTap(scoped, nodeIndex(scoped, "lpf"), "out", 0, 256);
		const plainOut = renderTap(plain, nodeIndex(plain, "lpf"), "out", 0, 256);
		expect([...scopedOut]).toEqual([...plainOut]);
	});

	describe("sweeps", () => {
		const BUCKETS = 512;
		const perBucket = Math.ceil((0.02 * SR) / BUCKETS); // default time
		// An open group with no bound members is an empty array at tick time
		// (runtime/group-view.ts), the same shape the real engine builds.
		const ch = new Float64Array(0) as unknown as number;
		const sine = (n: number) => Math.sin((2 * Math.PI * n) / 37);

		it("a bucket folds samplesPerBucket samples to their min/max", () => {
			const d = driver(getModule("scope"), {}, SR);
			let lo = Number.POSITIVE_INFINITY;
			let hi = Number.NEGATIVE_INFINITY;
			for (let n = 0; n < perBucket; n++) {
				lo = Math.min(lo, sine(n));
				hi = Math.max(hi, sine(n));
				d.step({ in: sine(n), ch });
			}
			expect(d.state.head).toBe(1);
			const buf = d.state.buf as Float32Array;
			expect(buf[0]).toBeCloseTo(lo, 6);
			expect(buf[1]).toBeCloseTo(hi, 6);
		});

		it("a full sweep waits, then the next starts on a rising edge through the midpoint", () => {
			const d = driver(getModule("scope"), {}, SR);
			let n = 0;
			while (d.state.head !== BUCKETS) d.step({ in: sine(n++), ch });
			while (d.state.head === BUCKETS) d.step({ in: sine(n++), ch });
			const trigger = sine(n - 1);
			expect(trigger).toBeGreaterThanOrEqual(0.05);
			expect(trigger).toBeGreaterThan(sine(n - 2));
		});

		it("a signal with no edge still sweeps again after one sweep's time (auto)", () => {
			const d = driver(getModule("scope"), {}, SR);
			let steps = 0;
			while (d.state.head !== BUCKETS) {
				d.step({ in: 0.3, ch });
				steps++;
			}
			const sweep = steps;
			while (d.state.head === BUCKETS) {
				d.step({ in: 0.3, ch });
				steps++;
			}
			expect(steps - sweep).toBe(sweep);
		});
	});

	it("scope({ a: sin(), b: tri() }) works; 8 members throws the traces error", () => {
		const program = evalPatch("scope({ a: sin(60), b: tri(67) }).out()");
		expect(program.nodes.some((n) => n.module === "scope")).toBe(true);

		const members: Record<string, string> = {};
		for (let i = 0; i < 8; i++) members[`m${i}`] = `sin(${60 + i})`;
		const memberList = Object.entries(members)
			.map(([k, v]) => `${k}: ${v}`)
			.join(", ");
		expect(() => evalPatch(`scope({ ${memberList} }).out()`)).toThrow(/traces|8/);
	});

	it("an eval-defined defmod with a display survives serialize -> hydrate", () => {
		const display = { kind: "wave", buffer: "buf", head: "head", traces: 4 } as const;
		const result = runEval(() => {
			defmod("myscope", { display }, ({ sr }: { sr: number }) => {
				const buf = new Float32Array(8);
				let head = 0;
				return ({ in: x = 0 }: { in: number }) => {
					buf[head] = x;
					head = (head + 1) % 8;
					return x;
				};
			});
		});
		const spec = result.specs.get("myscope");
		if (spec === undefined) throw new Error("myscope was not registered");
		const hydrated = hydrateSpec(serializeSpec(spec));
		expect(hydrated.display).toEqual(display);
	});

	it("a bad display decl (buffer naming a non-array field) throws at defmod", () => {
		expect(() =>
			runEval(() => {
				defmod(
					"badscope",
					{ display: { kind: "wave", buffer: "head", head: "head", traces: 4 } },
					({ sr }: { sr: number }) => {
						let head = 0;
						return ({ in: x = 0 }: { in: number }) => {
							head = head + 1;
							return x;
						};
					},
				);
			}),
		).toThrow(/buffer|typed-array/);
	});

	it('sin().pan(0).scope() throws and the message contains "scope({ l:"', () => {
		expect(() => evalPatch("sin().pan(0).scope()")).toThrow(/scope\(\{ l:/);
	});

	it("scope({ a: sin(), width: 200 }) sets node config width and the ch group member 'a'", () => {
		const program = evalPatch("scope({ a: sin(), width: 200 }).out()");
		const node = program.nodes[nodeIndex(program, "scope")];
		expect(node?.config.width).toBe(200);
		expect(node?.groups?.ch).toContain("a");
	});
});
