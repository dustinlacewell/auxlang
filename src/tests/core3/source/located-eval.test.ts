/**
 * Source locations through eval (MANIFESTO §10.1): nodes carry their call's
 * site, literal bindings their literal's site, pattern events their token's
 * site, and a loud failure points at the code that failed.
 */

import "@/core3/modules/all";

import type { Pat } from "@/core3/pattern/ast";
import { query } from "@/core3/pattern/query";
import { r } from "@/core3/pattern/rational";
import { errorRange } from "@/core3/source/located-error";
import type { SourceMap } from "@/core3/source/source-map";
import type { PNode } from "@/core3/types";
import { errorText } from "@/ui/core3-editor/error-text";
import { evaluatePatch } from "@/core3/eval-patch";
import { describe, expect, it } from "vitest";

function siteText(source: string, map: SourceMap, id: number | undefined): string | undefined {
	if (id === undefined) return undefined;
	const site = map.sites[id];
	return site === undefined ? undefined : source.slice(site.range.start, site.range.end);
}

function nodeOf(nodes: readonly PNode[], module: string): PNode {
	const node = nodes.find((n) => n.module === module);
	if (node === undefined) throw new Error(`no ${module} node`);
	return node;
}

/** The code a thrown error points at. */
function failure(source: string): { message: string; at: string | undefined } {
	try {
		evaluatePatch(source);
	} catch (err) {
		const range = errorRange(err);
		return {
			message: (err as Error).message,
			at: range === undefined ? undefined : source.slice(range.start, range.end),
		};
	}
	throw new Error("expected the patch to fail");
}

describe("nodes and bindings carry sites", () => {
	it("each node carries its own call, in a nested chain", () => {
		const src = "sin(60).lpf(800).mul(tri(3)).out()";
		const { program, sourceMap } = evaluatePatch(src);
		const at = (module: string) => siteText(src, sourceMap, nodeOf(program.nodes, module).site);
		expect(at("sin")).toBe("sin(60)");
		expect(at("lpf")).toBe("lpf(800)");
		expect(at("mul")).toBe("mul(tri(3))");
		expect(at("tri")).toBe("tri(3)");
	});

	it("a positional, an object-config and a negative literal bind with their sites", () => {
		const src = "sin(60, -0.5).lpf({ cutoff: 800, res: 0.3 }).out()";
		const { program, sourceMap } = evaluatePatch(src);
		const bound = (module: string, port: string) =>
			siteText(src, sourceMap, nodeOf(program.nodes, module).bindingSites?.[port]);
		expect(bound("sin", "pitch")).toBe("60");
		expect(bound("sin", "min")).toBe("-0.5");
		expect(bound("lpf", "cutoff")).toBe("800");
		expect(bound("lpf", "res")).toBe("0.3");
	});

	it("a setter keeps the node's call and rebinds the port's literal", () => {
		const src = "sin(60).lpf(800).cutoff(1200).out()";
		const { program, sourceMap } = evaluatePatch(src);
		const lpf = nodeOf(program.nodes, "lpf");
		expect(siteText(src, sourceMap, lpf.site)).toBe("lpf(800)");
		expect(siteText(src, sourceMap, lpf.bindingSites?.cutoff)).toBe("1200");
	});

	it("a value that is not the written literal carries no site", () => {
		const src = "const f = 2\nsin(60 * f).out()";
		const { program } = evaluatePatch(src);
		expect(nodeOf(program.nodes, "sin").bindingSites?.pitch).toBeUndefined();
	});

	it("the Program's identities ignore sites: moving code keeps every place", () => {
		const a = evaluatePatch("sin(60).lpf(800).out()").program;
		const b = evaluatePatch("\n\n  sin(60)\n    .lpf(800)\n    .out()").program;
		const identity = (n: PNode) => [n.kind, n.place, n.upstream, n.constants];
		expect(b.nodes.map(identity)).toEqual(a.nodes.map(identity));
	});
});

describe("pattern events carry their token's site", () => {
	function eventSites(patch: string): string[] {
		const src = `tempo(120)\n${patch}`;
		const { program, sourceMap } = evaluatePatch(src);
		const pattern = nodeOf(program.nodes, "seq").config.pattern as Pat;
		const events = query(pattern, { begin: r(0), end: r(1) }, { seed: 1, path: 0 });
		return events.map((e) => siteText(src, sourceMap, e.site) ?? "?");
	}

	it("a seq string: notes, rests and ties", () => {
		expect(eventSites('seq("c3 ~ e3 _").out()')).toEqual(["c3", "~", "e3", "_"]);
	});

	it("a p template, with a spliced number and a spliced string", () => {
		expect(eventSites('seq(p`c3 ${60} ${"e3 g3"}`).out()')).toEqual(["c3", "60", "e3", "g3"]);
	});

	it("a slide and a chord", () => {
		expect(eventSites('seq("c4_e4 [a3,c4]").out()').sort()).toEqual(
			["a3", "c4", "c4", "e4"].sort(),
		);
	});
});

describe("a loud failure points at the code", () => {
	it("an unknown port names the call that asked for it", () => {
		const { message, at } = failure("sin(60)\n  .lpf(800)\n  .wobble(3)\n  .out()");
		expect(message).toMatch(/'wobble' is not an input, output, or module for 'lpf'/);
		expect(at).toBe("wobble(3)");
	});

	it("an unknown module names its call", () => {
		expect(failure("sin(60).out()\nwobble(3).out()").at).toBe("wobble(3)");
	});

	it("too many positional arguments names the call", () => {
		expect(failure("sin(60, 0, 1, 2).out()").at).toBe("sin(60, 0, 1, 2)");
	});

	it("bad notation in a p template names the bad token", () => {
		const { message, at } = failure("seq(p`c3 [e3 g3`).out()");
		expect(message).toMatch(/unclosed '\['/);
		expect(at).toBe("[");
	});

	it("an invalid note in a seq string names the token", () => {
		const { message, at } = failure('seq("c3 x9 e3").out()');
		expect(message).toMatch(/invalid note or number 'x9'/);
		expect(at).toBe("x9");
	});

	it("the editor names the line and column", () => {
		const src = "sin(60)\n  .wobble(3)\n  .out()";
		const text = (() => {
			try {
				evaluatePatch(src);
			} catch (err) {
				return errorText(err, src);
			}
			return "";
		})();
		expect(text).toMatch(/^line 2, column 4 \(wobble\(3\)\): 'wobble' is not an input/);
	});

	it("a syntax error points where parsing failed", () => {
		const src = "sin(60).out(";
		const range = (() => {
			try {
				evaluatePatch(src);
			} catch (err) {
				return errorRange(err);
			}
			return undefined;
		})();
		expect(range?.start).toBe(src.length);
	});
});
