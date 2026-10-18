/**
 * `nodePorts(spec, groups)` expands a module's port groups into the node's
 * ports: an open group's members by bare name, any other's as
 * `group.member`, a `like` group with its target's members. With no groups
 * it returns the module's own lists.
 */

import { describe, expect, it } from "vitest";

import { nodePorts } from "@/dsp/node-ports";
import { group, sig, sigs, unit } from "@/types";

const plain = { ins: { in: sig(0) }, outs: { out: sig() } };

const mixer = {
	ins: { in: sig(0), ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },
	outs: { out: sig(), fields: group(sig(0), { open: true }) },
};

describe("nodePorts", () => {
	it("a module without groups gives its own lists", () => {
		const ports = nodePorts(plain);
		expect(ports.ins).toBe(plain.ins);
		expect(ports.outs).toBe(plain.outs);
		expect(ports.groups).toEqual({});
	});

	it("an open group's members are bare ports; a like group copies its target's members", () => {
		const ports = nodePorts(mixer, { ch: ["drums", "bass"], fields: ["vel"] });
		expect(Object.keys(ports.ins)).toEqual(["in", "drums", "bass", "level.drums", "level.bass"]);
		expect(Object.keys(ports.outs)).toEqual(["out", "vel"]);
		expect(ports.ins["level.bass"]).toEqual(unit(1));
		expect(ports.ins.drums).toEqual(sig(0));
		expect(ports.groups).toEqual({
			ch: ["drums", "bass"],
			level: ["level.drums", "level.bass"],
			fields: ["vel"],
		});
	});

	it("an array group's members are `group.index`", () => {
		const ports = nodePorts({ ins: { index: sig(0), palette: sigs(0) }, outs: { out: sig() } }, { palette: ["0", "1"] });
		expect(Object.keys(ports.ins)).toEqual(["index", "palette.0", "palette.1"]);
		expect(ports.groups).toEqual({ palette: ["palette.0", "palette.1"] });
	});

	it("a group with no members has no ports", () => {
		const ports = nodePorts(mixer);
		expect(Object.keys(ports.ins)).toEqual(["in"]);
		expect(ports.groups).toEqual({ ch: [], level: [], fields: [] });
	});
});
