/**
 * Block-scoped name resolution (front/scope/resolve-bindings.ts): each
 * reference names the binding JS would give it, or falls through to the
 * module's names. Shadowing is resolved by scope, never by name.
 */

import { describe, expect, it } from "vitest";

import { parseFunction } from "@/core3/module/front/parse/parse-function";
import type { Binding, Resolution, Scopes } from "@/core3/module/front/scope/binding";
import { resolveBindings } from "@/core3/module/front/scope/resolve-bindings";

function resolve(src: string, helpers: string[] = []): Scopes {
	return resolveBindings(parseFunction(src, "test").node, new Set(helpers));
}

/** The resolutions of the references named `name`, in source order. */
function refs(scopes: Scopes, name: string): Resolution[] {
	return [...scopes.references]
		.filter(([id]) => id.name === name)
		.sort(([a], [b]) => a.start - b.start)
		.map(([, r]) => r);
}

/** The bindings named `name`, in declaration order. */
function bindings(scopes: Scopes, name: string): Binding[] {
	return scopes.bindings.filter((b) => b.name === name).sort((a, b) => a.id.start - b.id.start);
}

function boundTo(r: Resolution | undefined): Binding | undefined {
	return r?.k === "binding" ? r.binding : undefined;
}

describe("resolveBindings", () => {
	it("gives each parameter its binding, by position", () => {
		const scopes = resolve("(s, i, o) => { o.out = i.in + s.n }");
		expect(scopes.params.map((p) => p?.name)).toEqual(["s", "i", "o"]);
		expect(boundTo(refs(scopes, "s")[0])).toBe(scopes.params[0]);
	});

	it("resolves an inner const to itself and the outer use to the outer let", () => {
		const scopes = resolve("(o) => { let n = 1; { const n = 2; o.out = n } o.out += n }");
		const [outer, inner] = bindings(scopes, "n");
		const [inBlock, after] = refs(scopes, "n");
		expect(inner?.kind).toBe("const");
		expect(boundTo(inBlock)).toBe(inner);
		expect(boundTo(after)).toBe(outer);
	});

	it("lets a block const shadow a parameter without becoming it", () => {
		const scopes = resolve("(s, o) => { { const s = 3; o.out = s } o.out += s.n }");
		const [inBlock, after] = refs(scopes, "s");
		expect(boundTo(inBlock)?.kind).toBe("const");
		expect(boundTo(after)).toBe(scopes.params[0]);
	});

	it("lets a local shadow a helper", () => {
		const scopes = resolve("(o) => { o.out = f(1); { const f = 2; o.out = f } }", ["f"]);
		const [call, local] = refs(scopes, "f");
		expect(call).toEqual({ k: "helper", name: "f" });
		expect(boundTo(local)?.kind).toBe("const");
	});

	it("falls through to the module's names when unbound", () => {
		const scopes = resolve(
			"(o) => { o.out = Math.PI + NaN + hashRandom(1) + __tableCount() + nope }",
		);
		expect(refs(scopes, "Math")).toEqual([{ k: "math" }]);
		expect(refs(scopes, "NaN")).toEqual([{ k: "global", name: "NaN" }]);
		expect(refs(scopes, "hashRandom")).toEqual([{ k: "intrinsic", name: "hashRandom" }]);
		expect(refs(scopes, "__tableCount")).toEqual([{ k: "intrinsic", name: "__tableCount" }]);
		expect(refs(scopes, "nope")).toEqual([{ k: "free", name: "nope" }]);
	});

	it("hoists a var to the function", () => {
		const scopes = resolve("(o) => { o.out = v; { var v = 1 } o.out = v }");
		const [binding] = bindings(scopes, "v");
		expect(binding?.kind).toBe("var");
		expect(refs(scopes, "v").map(boundTo)).toEqual([binding, binding]);
	});

	it("scopes a for-loop counter to the loop", () => {
		const scopes = resolve("(o) => { for (let k = 0; k < 2; k++) o.out = k; o.out = k }");
		const [counter] = bindings(scopes, "k");
		const uses = refs(scopes, "k");
		expect(uses.slice(0, -1).every((r) => boundTo(r) === counter)).toBe(true);
		expect(uses.at(-1)).toEqual({ k: "free", name: "k" });
	});

	it("scopes a switch's declarations to its cases", () => {
		const scopes = resolve(
			"(o) => { switch (o.n) { case 0: let x = 1; o.out = x; break; default: o.out = x } o.out = x }",
		);
		const [x] = bindings(scopes, "x");
		const [first, second, after] = refs(scopes, "x");
		expect(boundTo(first)).toBe(x);
		expect(boundTo(second)).toBe(x);
		expect(after).toEqual({ k: "free", name: "x" });
	});

	it("resolves a use before a let's declaration to that let", () => {
		const scopes = resolve("(o) => { o.out = x; let x = 1 }");
		expect(boundTo(refs(scopes, "x")[0])).toBe(bindings(scopes, "x")[0]);
	});

	it("records no property names or declarations as references", () => {
		const scopes = resolve("(o) => { const out = 1; o.out = out }");
		expect(refs(scopes, "out")).toHaveLength(1);
	});
});
