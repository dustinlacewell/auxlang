/**
 * Toy modules for the patch/compile tests. Registered once per test file via
 * root-scope `defmod` (vitest isolates each file's module graph, so the
 * registry starts empty and the duplicate-name guard never trips across
 * files). These are deliberately
 * minimal: the patch layer only reads their SPEC (ports, defaults, policy,
 * positional), never their tick.
 *
 * NOT imported from src/engine/modules on purpose — the contract requires the
 * api/compile layer to work against arbitrary registered modules.
 */

import { defmod } from "@/patch/defmod";
import { gatePort } from "@/types";

/** Registers the shared toy set. Call once at the top of a test file. */
export function registerToyModules(): void {
	// Oscillator: default-in `pitch`, positional [freq, min, max] (osc idiom).
	defmod("tosc", { args: ["freq", "min", "max"] }, () => {
		return ({ pitch = 69, freq = 0, min = -1, max = 1 }) => 0;
	});

	// Filter: default-in `in`, a required (def:null) `cutoff` for the honesty test.
	defmod("tlpf", { args: ["cutoff", "res"] }, () => {
		return ({ in: x = 0, cutoff = 1000, res = 0.2 }) => 0;
	});

	// A gain-like map module with a required input, to exercise def:null errors.
	defmod("treq", { args: ["amt"] }, () => {
		return ({ in: x, amt = 1 }: { in: number; amt: number }) => x * 0 + amt * 0;
	});

	// A multi-output tap source: pitch/gate outputs, like a sequencer.
	defmod("tseq", { outs: { gate: gatePort() } }, () => {
		return ({ clk = 0 }) => ({ out: 0, gate: 0 });
	});

	// Unit delay — the loop() back-edge target. Must be named "z1".
	defmod("z1", {}, () => {
		return ({ in: x = 0 }) => 0;
	});

	// Master output — reduce policy, named "out". Required by out()/.out().
	defmod("out", { reduce: true }, () => {
		return ({ in: x = 0, gain = 0.8 }) => ({ l: 0, r: 0 });
	});
}
