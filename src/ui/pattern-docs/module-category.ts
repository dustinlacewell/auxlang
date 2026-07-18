/**
 * Grouping heuristic for the auto-generated module reference: maps each
 * registered module name to a file-ish category, purely for table layout.
 * A module not listed falls to "utils"; the ordering here is the render order.
 */

export const CATEGORY_ORDER: readonly string[] = [
	"timing",
	"sources",
	"filters",
	"envelopes",
	"drums",
	"bridge",
	"utils",
];

const BY_CATEGORY: Record<string, readonly string[]> = {
	timing: ["clock", "seq"],
	sources: ["osc", "sin", "saw", "tri", "sqr", "noise"],
	filters: ["lpf", "hpf", "bpf", "notch"],
	envelopes: ["ad", "ar", "adsr"],
	drums: ["kick", "snare", "hihat", "clap"],
	bridge: ["patsig", "patstep"],
	utils: [
		"mul",
		"vca",
		"gain",
		"add",
		"sub",
		"div",
		"gt",
		"lt",
		"eq",
		"clip",
		"abs",
		"mod",
		"scale",
		"slew",
		"sah",
		"quantize",
		"z1",
		"delay",
		"pan",
		"mix",
		"out",
	],
};

const NAME_TO_CATEGORY: Record<string, string> = Object.fromEntries(
	Object.entries(BY_CATEGORY).flatMap(([cat, names]) => names.map((n) => [n, cat])),
);

export function categoryOf(name: string): string {
	return NAME_TO_CATEGORY[name] ?? "utils";
}
