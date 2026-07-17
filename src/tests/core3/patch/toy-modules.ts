/**
 * Toy modules for the patch/compile tests. Registered once per test file
 * (vitest isolates each file's module graph, so the registry starts empty and
 * the duplicate-name guard never trips across files). These are deliberately
 * minimal: the patch layer only reads their SPEC (ports, defaults, policy,
 * positional), never their tick.
 *
 * NOT imported from src/core3/modules on purpose — the contract requires the
 * api/compile layer to work against arbitrary registered modules.
 */

import { defineModule } from "@/core3/module/define";
import { hz, semis, sig, unit } from "@/core3/types";

const noop = () => {};

/** Registers the shared toy set. Call once at the top of a test file. */
export function registerToyModules(): void {
	// Oscillator: default-in `pitch`, positional [freq, min, max] (osc idiom).
	defineModule({
		name: "tosc",
		ins: { pitch: semis(69), freq: hz(0), min: sig(-1), max: sig(1) },
		outs: { out: sig() },
		defaultIn: "pitch",
		defaultOut: "out",
		positional: ["freq", "min", "max"],
		tick: noop,
	});

	// Filter: default-in `in`, a required (def:null) `cutoff` for the honesty test.
	defineModule({
		name: "tlpf",
		ins: { in: sig(0), cutoff: hz(1000), res: unit(0.2) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["cutoff", "res"],
		tick: noop,
	});

	// A gain-like map module with a required input, to exercise def:null errors.
	defineModule({
		name: "treq",
		ins: { in: sig(null), amt: unit(1) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["amt"],
		tick: noop,
	});

	// A multi-output tap source: pitch/gate outputs, like a sequencer.
	defineModule({
		name: "tseq",
		ins: { clk: sig(0) },
		outs: { out: semis(0), gate: gateLike() },
		defaultIn: "clk",
		defaultOut: "out",
		tick: noop,
	});

	// Unit delay — the loop() back-edge target. Must be named "z1".
	defineModule({
		name: "z1",
		ins: { in: sig(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		tick: noop,
	});

	// Master output — reduce policy, named "out". Required by out()/.out().
	defineModule({
		name: "out",
		ins: { in: sig(0), gain: unit(0.8) },
		outs: { l: sig(), r: sig() },
		defaultIn: "in",
		defaultOut: "l",
		policy: "reduce",
		tick: noop,
	});
}

function gateLike() {
	return { unit: "gate" as const, def: 0 };
}
