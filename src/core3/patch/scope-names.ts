/**
 * The user scope's reserved binding names — the ONE list. `buildUserScope`
 * (api.ts) layers exactly these over the generated module factories and
 * asserts against drift; `defmod` refuses spec names that would collide with
 * them (a module named `p` could never be reached call-style in a patch).
 */

export const RESERVED_SCOPE_NAMES: ReadonlySet<string> = new Set([
	// Patch builders (clock/seq/out/patstep override same-named modules).
	"clock",
	"seq",
	"out",
	"patstep",
	"loop",
	"p",
	"defmod",
	// PortAnn helpers (types.ts) — pure, exposed so defmod specs can annotate ports.
	"sig",
	"hz",
	"unit",
	"semis",
	"beats",
	"secs",
	"gatePort",
	"trigPort",
	"phasePort",
	"optional",
	// Continuous pattern-signal generators (0..1), lifted into any knob.
	"rand",
	"perlin",
	// Chord vocabulary: named chords → voicings / tone-index patterns.
	"chord",
]);
