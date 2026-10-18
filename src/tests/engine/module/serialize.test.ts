/**
 * `serializeSpec`/`hydrateSpec` (module/serialize.ts) carry a spec's `ins`/`outs`
 * as plain data; a port's `range` (types.ts) must survive the round trip.
 */

import { describe, expect, it } from "vitest";

import { hydrateSpec, serializeSpec } from "@/engine/module/serialize";
import type { ModuleSpec, TickFn } from "@/engine/types";

const tick: TickFn = (_state, ins, outs) => {
	outs.out = ins.in as number;
};

describe("serializeSpec/hydrateSpec: a port's range", () => {
	it("a range on an input survives serialize -> hydrate", () => {
		const spec: ModuleSpec = {
			name: "t",
			category: "utils",
			defaultIn: "in",
			ins: { in: { unit: "sig", def: 0.5, range: { min: 0, max: 1 } } },
			outs: { out: { unit: "sig", def: 0 } },
			writes: [],
			tick,
			source: { tick: "(s, ins, outs) => { outs.out = ins.in }", helpers: {} },
		};
		const hydrated = hydrateSpec(serializeSpec(spec));
		expect(hydrated.ins.in?.range).toEqual({ min: 0, max: 1 });
	});
});
