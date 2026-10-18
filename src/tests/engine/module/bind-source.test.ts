/**
 * `bindSource` binds a spec to a source already in hand. Given `origins` are
 * used as-is, with no text search; with no `origins` it falls back to the
 * same file search `bindModule` has always done.
 */

import { describe, expect, it } from "vitest";

import { bindSource } from "@/engine/module/bind-module";
import { withSourceText } from "@/engine/module/source-text";
import { sig } from "@/engine/types";

const spec = {
	name: "passthrough",
	category: "effects" as const,
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	writes: [],
	tick: (_s: Record<string, unknown>, i: Record<string, number>, o: Record<string, number>) => {
		o.out = i.in ?? 0;
	},
};

describe("bindSource", () => {
	it("uses given origins as-is, skipping the text search", () => {
		const tick = "(s, i, o) => { o.out = i.in; }";
		const bound = bindSource(
			spec,
			{ tick, helpers: {}, origins: { tick: { file: "patch", line: 42 } } },
			"first use",
		);
		expect(bound.source?.origins).toEqual({ tick: { file: "patch", line: 42 } });
	});

	it("with no origins, falls back to the file search `bindModule` used", () => {
		const tick = "(s, i, o) => { o.out = i.in; }";
		const bound = withSourceText({ file: "patch", text: `const m = ${tick};` }, () =>
			bindSource(spec, { tick, helpers: {} }, "first use"),
		);
		expect(bound.source?.origins).toEqual({ tick: { file: "patch", line: 1 } });
	});
});
