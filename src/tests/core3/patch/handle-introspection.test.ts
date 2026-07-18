/**
 * A handle is a Proxy that throws on unknown STRING props — but introspection
 * paths (symbols, toJSON, then, constructor, valueOf, …) must return undefined
 * so JSON.stringify, promise checks, and debuggers never explode.
 */

import { factory, runEval } from "@/core3/api";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("handle introspection whitelist", () => {
	it("JSON.stringify(handle) does not throw", () => {
		runEval(() => {
			const tosc = factory("tosc");
			const h = tosc(220);
			expect(() => JSON.stringify(h)).not.toThrow();
		});
	});

	it("then / constructor / symbols read as undefined, not errors", () => {
		runEval(() => {
			const tosc = factory("tosc");
			const h = tosc(220);
			expect(h.then).toBeUndefined();
			expect(h.constructor).toBeUndefined();
			expect(h.toJSON).toBeUndefined();
			expect((h as unknown as Record<symbol, unknown>)[Symbol.iterator]).toBeUndefined();
		});
	});

	it("still throws loudly on an unknown non-whitelisted string prop", () => {
		runEval(() => {
			const tosc = factory("tosc");
			const h = tosc(220);
			expect(() => void h.bogusProp).toThrow(/bogusProp/);
		});
	});
});
