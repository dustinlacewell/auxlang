/**
 * The table intrinsics (module/tick-subset/table-intrinsics.ts): only the
 * tick of a module that declares `reads: "pattern"` may call them, with
 * named state and config parameters, the right argument count, and a row
 * field named by a string literal. `reads` crosses to the engine with the
 * spec.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getModule } from "@/core3/module/define";
import { hydrateSpec, serializeSpec } from "@/core3/module/serialize";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

/** A patch defining module `t`; the tick body starts on patch line 10. */
function patch(
	body: string,
	opts: { reads?: boolean; helpers?: string; params?: string } = {},
): string {
	return [
		"defmod({",
		'  name: "t",',
		'  category: "utils",',
		"  ins: { in: sig(0) },",
		"  outs: { out: sig() },",
		'  defaultIn: "in",',
		'  defaultOut: "out",',
		opts.reads === false ? "" : '  reads: "pattern",',
		`  helpers: { ${opts.helpers ?? ""} },`,
		`  tick: (${opts.params ?? "s, i, o, cfg"}) => {`,
		`    ${body}`,
		"  },",
		"})",
	].join("\n");
}

const FORBIDDEN: readonly [string, string, Parameters<typeof patch>[1], RegExp][] = [
	["without reads", "o.out = __tableCount();", { reads: false }, /declares reads: "pattern"/],
	[
		"config unnamed",
		"o.out = __tableCount();",
		{ params: "s, i, o" },
		/state and config parameters/,
	],
	["wrong argument count", "o.out = __tableCycle(1);", {}, /__tableCycle takes no arguments/],
	["unknown row field", 'o.out = __tableRow("nope", 0);', {}, /row field name: "begin"/],
	["row field not a literal", "o.out = __tableRow(i.in, 0);", {}, /row field name/],
	["an intrinsic as a value", "const f = __tableCount;", {}, /'__tableCount' may only be called/],
];

describe("table intrinsics in the tick subset", () => {
	it.each(FORBIDDEN)("%s throws", (_label, body, opts, reason) => {
		expect(() => evalPatch(patch(body, opts))).toThrow(reason);
	});

	it("only the tick may call them", () => {
		expect(() => evalPatch(patch("o.out = h();", { helpers: "h: () => __tableCount()" }))).toThrow(
			/helper 'h' at patch line 9: __tableCount\(\) is available only in tick/,
		);
	});

	it("a pattern-reading tick passes the check", () => {
		const body =
			'if (__tableCycle() !== 0) __tableFill(0); o.out = __tableRow("value", __tableCount() - 1);';
		expect(() => evalPatch(patch(body))).not.toThrow();
	});

	it("reads crosses to the engine with the spec", () => {
		expect(hydrateSpec(serializeSpec(getModule("seq"))).reads).toBe("pattern");
	});
});
