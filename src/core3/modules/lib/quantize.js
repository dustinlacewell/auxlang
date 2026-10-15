/**
 * Pitch quantizer — operates directly in SEMITONES (no Hz round-trip).
 *
 * The incoming `pitch` is snapped to the nearest degree of `scaleName` taken
 * relative to `root` (a semitone pitch class). The snapped pitch is then folded
 * into the window [octave*12 + root, (octave+range)*12 + root) so `octave`/`range`
 * (in octaves) place and size the playable band. Scale tables are the same set
 * as core2's quantize, written as 12-bit masks: bit k set = degree k is in the
 * scale. An unknown scale name falls back to major.
 */

/** The degree mask of a named scale. */
function scaleMask(name) {
	switch (name) {
		case "minor":
			return 0b010110101101; // 0 2 3 5 7 8 10
		case "dorian":
			return 0b011010101101; // 0 2 3 5 7 9 10
		case "phrygian":
			return 0b010110101011; // 0 1 3 5 7 8 10
		case "lydian":
			return 0b101011010101; // 0 2 4 6 7 9 11
		case "mixolydian":
			return 0b011010110101; // 0 2 4 5 7 9 10
		case "locrian":
			return 0b010101101011; // 0 1 3 5 6 8 10
		case "minor pentatonic":
			return 0b010010101001; // 0 3 5 7 10
		case "major pentatonic":
			return 0b001010010101; // 0 2 4 7 9
		case "blues":
		case "minor blues":
		case "pentatonic blues":
			return 0b010011101001; // 0 3 5 6 7 10
		case "major blues":
			return 0b001010011101; // 0 2 3 4 7 9
		case "whole tone":
			return 0b010101010101; // 0 2 4 6 8 10
		case "chromatic":
			return 0b111111111111; // 0 1 2 3 4 5 6 7 8 9 10 11
		default:
			return 0b101010110101; // major: 0 2 4 5 7 9 11
	}
}

/** Nearest allowed pitch (absolute semitones) to `pitch`, scale `mask` rooted at `root`. */
function snap(pitch, root, mask) {
	const rel = pitch - root;
	const octave = Math.floor(rel / 12);
	const within = rel - octave * 12; // 0..12
	let best = 0;
	// biome-ignore lint/style/useNumberNamespace: a helper may not name `Number` (tick subset)
	let bestDist = Infinity;
	// each degree in this octave, plus its wrap into the next (e.g. 11 → 12)
	for (let deg = 0; deg < 12; deg++) {
		if (((mask >> deg) & 1) === 0) continue;
		const dist = Math.abs(within - deg);
		if (dist < bestDist) {
			bestDist = dist;
			best = deg;
		}
		const wrapped = deg + 12;
		const wrapDist = Math.abs(within - wrapped);
		if (wrapDist < bestDist) {
			bestDist = wrapDist;
			best = wrapped;
		}
	}
	return root + octave * 12 + best;
}

defmod({
	name: "quantize",
	category: "utils",
	doc: "Snaps pitch to the nearest note of a scale.",
	ins: {
		pitch: semis(60),
		root: semis(0),
		octave: sig(4),
		range: sig(3),
	},
	outs: { out: semis(0) },
	defaultIn: "pitch",
	defaultOut: "out",
	positional: ["root", "octave", "range"],
	config: { scaleName: "major" },
	helpers: { scaleMask, snap },
	tick: (_s, i, o, cfg) => {
		const snapped = snap(i.pitch, i.root, scaleMask(cfg.scaleName));
		const range = Math.max(1, Math.round(i.range));
		const base = Math.round(i.octave) * 12 + i.root;
		const span = range * 12;
		// fold snapped pitch into [base, base+span)
		let folded = snapped;
		if (span > 0) {
			folded = base + ((((snapped - base) % span) + span) % span);
		}
		o.out = folded;
	},
});
