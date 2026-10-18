/**
 * The rewrite's location tables (MANIFESTO §10.1): for known code, every call,
 * numeric literal and pattern token is listed with the right range.
 */

import { rewrite } from "@/engine/source/rewrite/rewrite";
import type { Site, SourceMap } from "@/engine/source/source-map";
import { describe, expect, it } from "vitest";

const SCOPE = new Set(["sin", "saw", "tri", "lpf", "seq", "p", "tempo", "defmod", "out", "clip"]);

function tables(source: string): SourceMap {
	return rewrite(source, SCOPE).sourceMap;
}

function texts(source: string, kind: Site["kind"]): string[] {
	return tables(source)
		.sites.filter((s) => s.kind === kind)
		.map((s) => source.slice(s.range.start, s.range.end));
}

function tokens(source: string): string[] {
	return texts(source, "token");
}

describe("call sites", () => {
	it("a nested chain lists each call from its method name to its closing paren", () => {
		const src = "sin(60).lpf(800).mul(tri(3)).out()";
		expect(texts(src, "call").sort()).toEqual(
			["out()", "mul(tri(3))", "lpf(800)", "sin(60)", "tri(3)"].sort(),
		);
	});

	it("method calls on a variable, and the callee name", () => {
		const src = "const s = seq('c3')\ns.saw().lpf(900)";
		const calls = tables(src).sites.filter((s) => s.kind === "call");
		expect(calls.map((c) => (c.kind === "call" ? c.callee : null)).sort()).toEqual(
			["lpf", "saw", "seq"].sort(),
		);
	});

	it("a call records its literal arguments, positional and object config", () => {
		const src = "lpf({ cutoff: 800, res: -0.3 }).saw(60)";
		const map = tables(src);
		const lpf = map.sites.find((s) => s.kind === "call" && s.callee === "lpf");
		const saw = map.sites.find((s) => s.kind === "call" && s.callee === "saw");
		const at = (id: number) => {
			const range = map.sites[id]?.range;
			return range === undefined ? undefined : src.slice(range.start, range.end);
		};
		if (lpf?.kind !== "call" || saw?.kind !== "call") throw new Error("calls missing");
		const config = lpf.args[0];
		if (config === null || config === undefined || !("props" in config))
			throw new Error("no props");
		const { cutoff, res } = config.props;
		if (cutoff === undefined || res === undefined) throw new Error("props missing");
		expect(at(cutoff.site)).toBe("800");
		expect(at(res.site)).toBe("-0.3");
		expect(res.value).toBe(-0.3);
		const first = saw.args[0];
		if (first === null || first === undefined || !("site" in first)) throw new Error("no literal");
		expect(at(first.site)).toBe("60");
	});
});

describe("number sites", () => {
	it("object-config numbers, negative numbers, and numbers inside arrays", () => {
		const src = "lpf({ cutoff: 800, res: 0.3 }).add(-12).mul([1, -2.5, 3])";
		expect(texts(src, "number")).toEqual(["800", "0.3", "-12", "1", "-2.5", "3"]);
	});

	it("a negated number is one site with the negative value", () => {
		const map = tables("sin(-7)");
		const site = map.sites.find((s) => s.kind === "number");
		expect(site?.kind === "number" ? site.value : null).toBe(-7);
		expect(site?.range).toEqual({ start: 4, end: 6 });
	});
});

describe("pattern tokens", () => {
	it("a seq string: every mini-notation token, with its range", () => {
		const src = 'seq("[a,b] <a b> a@2 a?0.3 a(3,8) c4_e4 ~ _")';
		expect(tokens(src).join(" ")).toBe("[ a , b ] < a b > a @ 2 a ? 0.3 a ( 3 , 8 ) c4 _ e4 ~ _");
		const map = tables(src);
		const ranges = map.sites.flatMap((s) => (s.kind === "token" ? [s.range] : []));
		expect(ranges[0]).toEqual({ start: 5, end: 6 });
		expect(ranges[14]).toEqual({ start: 23, end: 26 }); // 0.3
	});

	it("token kinds tell a tie joiner from an extend step", () => {
		const map = tables('seq("c4_e4 ~ _")');
		const kinds = map.sites.flatMap((s) => (s.kind === "token" ? [s.token] : []));
		expect(kinds).toEqual(["atom", "tie", "atom", "rest", "extend"]);
	});

	it("a p template with splices: literal tokens, and the spliced literals", () => {
		const src = 'p`c3 ${60} ${"e3 g3"} ${hook} a`';
		expect(tokens(src)).toEqual(["e3", "g3", "c3", "a"]);
		const map = tables(src);
		const template = map.sites.find(
			(s) => s.kind === "pattern" && src.slice(s.range.start, s.range.end).startsWith("p`"),
		);
		if (template?.kind !== "pattern") throw new Error("no template site");
		const spliced = template.splices.map((id) => {
			const range = id === null ? undefined : map.sites[id]?.range;
			return range === undefined ? null : src.slice(range.start, range.end);
		});
		expect(spliced).toEqual(["60", '"e3 g3"', null]);
	});

	it("the p call links to its pattern site", () => {
		const map = tables("p`c3 e3`.fast(2)");
		const call = map.sites.find((s) => s.kind === "call" && s.callee === "p");
		expect(call?.kind === "call" && call.pattern !== undefined).toBe(true);
	});

	it("a pattern that does not tokenize still has a site, but no tokens", () => {
		const map = tables('seq("c3 $")');
		expect(map.sites.some((s) => s.kind === "pattern")).toBe(true);
		expect(map.sites.some((s) => s.kind === "token")).toBe(false);
	});
});

describe("the rewritten code", () => {
	it("wraps traced calls and keeps every line where it was", () => {
		const src = "tempo(120)\nsin(60)\n  .out()";
		const { code } = rewrite(src, SCOPE);
		expect(code.split("\n").length).toBe(3);
		expect(code).toContain("__aux.enter(");
	});

	it("leaves a lambda, a shape-C defmod's name/meta/setup, Math calls and optional chains byte-identical", () => {
		const lambda = "(s, sr, t) => Math.sin(t * 3)";
		const name = "'t'";
		const meta = "{}";
		const setup = "() => { return ({ in: x = 0 }) => clip(x) }";
		const chain = "a?.b().c(3)";
		const src = `sin(${lambda}).out()\ndefmod(${name}, ${meta}, ${setup})\n${chain}`;
		const { code } = rewrite(src, SCOPE);
		expect(code).toContain(lambda);
		expect(code).toContain(name);
		expect(code).toContain(meta);
		expect(code).toContain(setup);
		expect(code).toContain(chain);
	});

	it("leaves an out-of-line shape-C defmod setup byte-identical", () => {
		const setup = "() => { return ({ in: x = 0 }) => clip(x) }";
		const { code } = rewrite(`const setup = ${setup}\ndefmod('t', {}, setup)`, SCOPE);
		expect(code).toContain(setup);
	});

	it("code that does not parse is returned unchanged, with where it failed", () => {
		const src = "sin(60).out(";
		const { code, sourceMap } = rewrite(src, SCOPE);
		expect(code).toBe(src);
		expect(sourceMap.syntaxError?.start).toBe(src.length);
	});
});
