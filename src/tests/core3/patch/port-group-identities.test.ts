/**
 * Identity of port group members (D2 on the per-node ports card): a member
 * hops by its group's name and a group's sources sign sorted, so renaming,
 * reordering or adding a member leaves every node's place and upstream
 * signature alone. Rewiring a channel never resets the module feeding it.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { defmod, factory, runProgram } from "@/core3/api";
import type { Handle } from "@/core3/patch/handle-data";
import { group, type Program, sig, unit } from "@/core3/types";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

const defMix = () =>
	defmod({
		name: "gmix",
		category: "utils",
		ins: { in: sig(0), ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		tick: (_s: Record<string, unknown>, i: { in: number }, o: { out: number }) => {
			o.out = i.in;
		},
	});

/** A mixer over `channels(sources)`: each source is a toy chain. */
const mixed = (channels: (a: Handle, b: Handle) => Record<string, Handle>): Program =>
	runProgram(() => {
		const tosc = factory("tosc");
		defMix()(channels(tosc(1), tosc(2).tlpf(800))).out();
	});

/** Every node's (module, place, upstream), sorted: the identities a re-eval matches on. */
const identities = (program: Program) =>
	program.nodes.map((n) => `${n.module}@${n.place}|${n.upstream}`).sort();

describe("port group member identity", () => {
	const base = () => mixed((a, b) => ({ drums: a, bass: b }));

	it("renaming members keeps every place and upstream signature", () => {
		expect(identities(mixed((a, b) => ({ kick: a, sub: b })))).toEqual(identities(base()));
	});

	it("reordering members keeps every place and upstream signature", () => {
		expect(identities(mixed((a, b) => ({ bass: b, drums: a })))).toEqual(identities(base()));
	});

	it("adding a member keeps the places of the nodes already there", () => {
		const added = mixed((a, b) => ({ drums: a, bass: b, keys: factory("tosc")(3).tlpf(400) }));
		const places = new Set(added.nodes.map((n) => `${n.module}@${n.place}`));
		for (const n of base().nodes) expect(places).toContain(`${n.module}@${n.place}`);
	});
});
