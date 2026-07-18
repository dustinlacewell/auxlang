/**
 * Loud-failure quality: the patch layer must reject confusion at eval time and
 * name what was available. Silent no-ops are bugs.
 */

import { mod, out, runEval } from "@/core3/api";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("chain default-input collision", () => {
	it("errors when a chained module also sets its default input", () => {
		expect(() =>
			runEval(() => {
				const tosc = mod("tosc");
				const tlpf = mod("tlpf");
				// tlpf's default input is `in`; chaining already bound it.
				tosc(220).tlpf({ in: 5 });
			}),
		).toThrow(/'in'.*chaining.*tlpf/s);
	});

	it("allows setting a NON-default input while chaining", () => {
		expect(() =>
			runEval(() => {
				const tosc = mod("tosc");
				out(tosc(220).tlpf({ cutoff: 500 }));
			}),
		).not.toThrow();
	});
});

describe("unknown object key", () => {
	it("names the module, the bad key, and the available ports", () => {
		let message = "";
		try {
			runEval(() => {
				const tlpf = mod("tlpf");
				tlpf({ cuttof: 800 }); // typo
			});
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toMatch(/tlpf/);
		expect(message).toMatch(/cuttof/);
		expect(message).toMatch(/cutoff/); // lists the real ports
	});
});

describe("unknown property", () => {
	it("errors with ports, and hints how to set inputs / chain modules", () => {
		let message = "";
		try {
			runEval(() => {
				const tosc = mod("tosc");
				// `resonance` is not a port, output, or module.
				void tosc(220).resonance;
			});
		} catch (e) {
			message = (e as Error).message;
		}
		expect(message).toMatch(/resonance/);
		expect(message).toMatch(/tosc/);
		expect(message).toMatch(/inputs:/);
		expect(message).toMatch(/Known modules:/);
	});
});

describe("excess positional arguments", () => {
	it("errors naming the positional slots", () => {
		expect(() =>
			runEval(() => {
				const tosc = mod("tosc");
				// tosc positional is [freq, min, max] — four args is one too many.
				tosc(220, -1, 1, 99);
			}),
		).toThrow(/too many positional/);
	});
});
