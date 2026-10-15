/**
 * Modules whose tick is NOT held to the tick subset and NOT rebuilt from
 * source: their tick runs as the host closure it was written as. This list
 * exists only for the bridge modules, which still call TypeScript helpers
 * (bridge/, pattern/table/) from their ticks. Moving those into `helpers`
 * empties it; nothing else may be added.
 */
export const EXEMPT_MODULES: ReadonlySet<string> = new Set([
	"seq",
	"clock",
	"counter",
	// TRANSITIONAL: built-ins still in TypeScript; each leaves this list when
	// it moves into lib/.
	...["sin", "saw", "tri", "sqr", "lfo", "fm", "lpf", "hpf", "bpf", "notch", "ad", "ar", "adsr"],
	...["add", "sub", "div", "gt", "lt", "eq", "clip", "abs", "wrap", "period", "scale", "slew"],
	...["sah", "noise", "z1", "delay", "reverb", "phaser", "shape", "pan", "mix", "out"],
	...["quantize", "kick", "snare", "hihat", "clap"],
	...["hz2semis", "semis2hz", "beats2secs", "secs2beats"],
]);
