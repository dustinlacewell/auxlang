import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import type { ModuleSpec } from "@/core3/types";
import { SR } from "./helpers";

/** Reserved wrapper/handle words that must never be a port name. */
const RESERVED_PORTS = ["apply", "lane", "id", "width"];

/** Modules whose default output is legitimately NOT "out". */
const NON_OUT_DEFAULTS: Record<string, string> = {
	clock: "phase",
	pan: "l",
	out: "l",
};

const registry = getRegistry();
const specs: [string, ModuleSpec][] = [...registry.entries()];

describe("registry is populated", () => {
	it("has every expected module registered", () => {
		expect(specs.length).toBeGreaterThan(20);
		for (const name of ["osc", "lpf", "adsr", "delay", "quantize", "noise", "out", "clock", "kick"]) {
			expect(registry.has(name)).toBe(true);
		}
	});
});

describe.each(specs)("contract: %s", (name, spec) => {
	it("defaultIn ∈ ins", () => {
		expect(spec.ins).toHaveProperty(spec.defaultIn);
	});

	it("defaultOut ∈ outs", () => {
		expect(spec.outs).toHaveProperty(spec.defaultOut);
	});

	it("no port uses a reserved wrapper name (apply/lane/id/width)", () => {
		const ports = [...Object.keys(spec.ins), ...Object.keys(spec.outs)];
		for (const p of ports) expect(RESERVED_PORTS).not.toContain(p);
	});

	it('any port named "out" is the default output (never a secondary tap)', () => {
		// A tappable secondary "out" would collide with the handle's terminal .out().
		if ("out" in spec.outs) expect(spec.defaultOut).toBe("out");
		expect("out" in spec.ins).toBe(false);
	});

	it("default output is 'out' unless whitelisted (clock/pan/out)", () => {
		const expected = NON_OUT_DEFAULTS[name] ?? "out";
		expect(spec.defaultOut).toBe(expected);
	});

	it("positional names are all real inputs or config keys", () => {
		for (const p of spec.positional ?? []) {
			const known = p in spec.ins || p in (spec.config ?? {});
			expect(known).toBe(true);
		}
	});

	it("state() returns plain serializable data (JSON round-trips; typed arrays ok)", () => {
		if (!spec.state) return;
		const st = spec.state(SR);
		for (const [k, v] of Object.entries(st)) {
			const ok = typeof v === "number" || typeof v === "string" || ArrayBuffer.isView(v);
			expect(ok, `state key '${k}' is ${typeof v}`).toBe(true);
		}
		// JSON round-trip of the non-typed-array portion
		const plain: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(st)) if (!ArrayBuffer.isView(v)) plain[k] = v;
		expect(() => JSON.parse(JSON.stringify(plain))).not.toThrow();
		expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
	});

	it("tick runs without allocating new state keys (steady-state key set is stable)", () => {
		if (!spec.state) return;
		const st = spec.state(SR);
		const before = Object.keys(st).sort();
		const ins: Record<string, number> = {};
		for (const [p, ann] of Object.entries(spec.ins)) ins[p] = ann.def == null ? 0 : ann.def;
		const outs: Record<string, number> = {};
		for (const p of Object.keys(spec.outs)) outs[p] = 0;
		const cfg = { ...(spec.config ?? {}) };
		if (spec.policy === "reduce") {
			const t = spec.tick as (...a: unknown[]) => void;
			for (let k = 0; k < 200; k++) t(st, ins, outs, cfg, SR, 1);
		} else {
			const t = spec.tick as (...a: unknown[]) => void;
			for (let k = 0; k < 200; k++) t(st, ins, outs, cfg, SR);
		}
		expect(Object.keys(st).sort()).toEqual(before);
	});
});
