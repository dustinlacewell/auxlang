/**
 * The tick subset's write rules for a port group (module/front/rules/
 * check-write.ts): a tick writes an out group's members by index
 * (`o.g[k] = v`), never the group as a whole (`o.g = v`) nor a plain output
 * by index (`o.plain[k] = v`); in-groups stay read-only like every input.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

function patch(outs: string, body: string): string {
	return [
		"const t = defmod({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { ch: group(sig(0), { open: true }) },",
		`  outs: { ${outs} },`,
		'  defaultIn: "ch",',
		"  tick: (s, i, o, c) => {",
		`    ${body}`,
		"  },",
		"})",
	].join("\n");
}

describe("port group writes", () => {
	it("writing the group as a whole fails", () => {
		expect(() => evalPatch(patch("g: group(sig(), { open: true })", "o.g = 1;"))).toThrow(
			/write a group's members by index \(o\.g\[k\]\)/,
		);
	});

	it("writing a plain output by index fails with the existing message", () => {
		expect(() => evalPatch(patch("plain: sig()", "o.plain[0] = 1;"))).toThrow(
			/write outputs by name \(o\.out\)/,
		);
	});

	it("writing an in-group member stays read-only", () => {
		expect(() => evalPatch(patch("plain: sig()", "i.ch[0] = 1;"))).toThrow(
			/inputs and config are read-only/,
		);
	});

	it("writing an out-group member by index is allowed", () => {
		const program = evalPatch(
			[
				patch(
					"g: group(sig(), { open: true })",
					"for (let k = 0; k < i.ch.length; k++) o.g[k] = i.ch[k] * 2;",
				),
				"t({ ch: { a: 1 }, g: ['a'] }).a.out()",
			].join("\n"),
		);
		expect(program.nodes.some((n) => n.module === "t")).toBe(true);
	});
});
