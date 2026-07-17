import { defineModule } from "../module/define";
import { semis, sig } from "../types";

/**
 * Pitch quantizer — operates directly in SEMITONES (no Hz round-trip).
 *
 * The incoming `pitch` is snapped to the nearest degree of `scaleName` taken
 * relative to `root` (a semitone pitch class). The snapped pitch is then folded
 * into the window [octave*12 + root, (octave+range)*12 + root) so `octave`/`range`
 * (in octaves) place and size the playable band. Scale tables are the same set
 * as core2's quantize, expressed as semitone offsets within an octave.
 */

const SCALES: Record<string, number[]> = {
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	phrygian: [0, 1, 3, 5, 7, 8, 10],
	lydian: [0, 2, 4, 6, 7, 9, 11],
	mixolydian: [0, 2, 4, 5, 7, 9, 10],
	locrian: [0, 1, 3, 5, 6, 8, 10],
	"minor pentatonic": [0, 3, 5, 7, 10],
	"major pentatonic": [0, 2, 4, 7, 9],
	blues: [0, 3, 5, 6, 7, 10],
	"minor blues": [0, 3, 5, 6, 7, 10],
	"major blues": [0, 2, 3, 4, 7, 9],
	"pentatonic blues": [0, 3, 5, 6, 7, 10],
	"whole tone": [0, 2, 4, 6, 8, 10],
	chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/** Nearest allowed pitch (absolute semitones) to `pitch`, scale rooted at `root`. */
function snap(pitch: number, root: number, scale: number[]): number {
	const rel = pitch - root;
	const octave = Math.floor(rel / 12);
	const within = rel - octave * 12; // 0..12
	let best = scale[0] ?? 0;
	let bestDist = Infinity;
	// consider this octave's degrees plus the wrap into the next (e.g. 11 → 12)
	for (const deg of scale) {
		for (const d of [deg, deg + 12]) {
			const dist = Math.abs(within - d);
			if (dist < bestDist) {
				bestDist = dist;
				best = d;
			}
		}
	}
	return root + octave * 12 + best;
}

export const quantize = defineModule({
	name: "quantize",
	ins: {
		pitch: semis(60),
		root: semis(0),
		octave: sig(4),
		range: sig(3),
	},
	outs: { out: semis() },
	defaultIn: "pitch",
	defaultOut: "out",
	positional: ["root", "octave", "range"],
	config: { scaleName: "major" },
	tick: (_s, i, o, cfg) => {
		const scale = SCALES[cfg.scaleName as string] ?? SCALES.major!;
		const snapped = snap(i.pitch, i.root, scale);
		const range = Math.max(1, Math.round(i.range));
		const base = Math.round(i.octave) * 12 + i.root;
		const span = range * 12;
		// fold snapped pitch into [base, base+span)
		let folded = snapped;
		if (span > 0) {
			folded = base + (((snapped - base) % span) + span) % span;
		}
		o.out = folded;
	},
});
