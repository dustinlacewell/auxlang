/**
 * Which glow shape a watched output gets (LED glow, MANIFESTO §10.2). Port
 * units are documentation, not a type system (core3/types.ts), so `sig` alone
 * cannot say "audio" from "bipolar control" — this file is the one place that
 * heuristic lives.
 *
 * Rule, in order:
 *   1. `gate` or `trig` unit -> "trig" (a flash on rising edges).
 *   2. `unit` (0..1 knob), or any non-`sig` unit (`hz`, `semis`, `secs`,
 *      `beats`, `phase`) -> "unipolar" (brightness from the last value).
 *   3. `sig` in category "envelopes" -> "unipolar" (adsr/ad/ar are 0..1 curves
 *      written with a -1..1 port only because `sig` is the generic signal
 *      annotation).
 *   4. `sig` in category "sources", "filters" or "effects" -> "audio" (peak
 *      level), UNLESS the module is "lfo" by name: lfo is control-rate and
 *      genuinely bipolar, and nothing in its port shape says so (its
 *      `defaultIn` is `freq`/hz, same unit family an audio oscillator's `fm`
 *      input uses) — a named exception, same footing as module-highlight.ts
 *      keying off real module specs by name.
 *   5. `sig` anywhere else (utils, drums, timing, bridge) -> "bipolar".
 */

import type { ModulePorts } from "@/core3/types";

export type OutputKind = "unipolar" | "bipolar" | "audio" | "trig";

export function classifyOutput(spec: ModulePorts, port: string): OutputKind {
	const ann = spec.outs[port];
	if (ann === undefined) throw new Error(`classifyOutput: ${spec.name} has no output "${port}"`);

	if (ann.unit === "gate" || ann.unit === "trig") return "trig";
	if (ann.unit !== "sig") return "unipolar";
	if (spec.category === "envelopes") return "unipolar";
	if (spec.name === "lfo") return "bipolar";
	if (spec.category === "sources" || spec.category === "filters" || spec.category === "effects") {
		return "audio";
	}
	return "bipolar";
}
