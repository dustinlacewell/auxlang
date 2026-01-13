import { Scale } from "tonal";
import { device } from "../device/device";
import { inputs } from "../device/inputs";

// Parse interval string to semitones
function intervalToSemitones(interval: string): number {
	const match = interval.match(/^(\d+)(m|M|P|A|d)?$/);
	if (!match) return 0;
	const degree = parseInt(match[1] ?? "1", 10);
	const quality = match[2] ?? "";
	const bases: Record<number, number> = {
		1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12,
	};
	let semi = bases[degree] ?? 0;
	if (quality === "m") semi -= 1;
	if (quality === "A") semi += 1;
	if (quality === "d") semi -= 1;
	return semi;
}

// Get semitones for a scale name
function getScaleSemitones(scaleName: string): number[] {
	const scaleData = Scale.get(scaleName);
	if (!scaleData.intervals || scaleData.intervals.length === 0) {
		return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // chromatic fallback
	}
	return scaleData.intervals.map(intervalToSemitones);
}

// Precompute semitones for common scales
const SCALE_SEMITONES: Record<string, number[]> = {
	major: getScaleSemitones("major"),
	minor: getScaleSemitones("minor"),
	dorian: getScaleSemitones("dorian"),
	phrygian: getScaleSemitones("phrygian"),
	lydian: getScaleSemitones("lydian"),
	mixolydian: getScaleSemitones("mixolydian"),
	locrian: getScaleSemitones("locrian"),
	"minor pentatonic": getScaleSemitones("minor pentatonic"),
	"major pentatonic": getScaleSemitones("major pentatonic"),
	blues: getScaleSemitones("blues"),
	"minor blues": getScaleSemitones("minor blues"),
	"major blues": getScaleSemitones("major blues"),
	"pentatonic blues": [0, 3, 5, 6, 7, 10], // minor pentatonic + b5 blue note
	"whole tone": getScaleSemitones("whole tone"),
	chromatic: getScaleSemitones("chromatic"),
};

/**
 * Quantize a frequency to the nearest note in a scale.
 *
 * Usage:
 *   lfo(0.5).scale({ min: 200, max: 800 }).quantize({ scale: "major" })
 *   noise().scale({ min: 200, max: 600 }).quantize({ scale: "minor pentatonic", root: 9 })
 *
 * Root is 0-11 semitones from C (0=C, 2=D, 4=E, 5=F, 7=G, 9=A, 11=B)
 * Range is number of octaves (can be fractional, e.g. 2.5 for 2.5 octaves)
 * Scales: major, minor, dorian, phrygian, lydian, mixolydian, locrian,
 *         minor pentatonic, major pentatonic, blues, whole tone, chromatic
 */
export const quantize = device("quantize", {
	inputs: inputs({ input: 440, root: 0, octave: 3, range: 4 }),
	config: { scales: SCALE_SEMITONES, scaleName: "major" },
	outputs: ["freq"],
	defaultInput: "input",
	defaultOutput: "freq",
	positionalArgs: ["scaleName", "root", "octave", "range"],
	process(inp, cfg, state, _sampleRate, _time, out) {
		const inputFreq = (inp.input as number) ?? 440;
		const root = (inp.root as number) ?? 0;
		const octave = (inp.octave as number) ?? 3;
		const range = (inp.range as number) ?? 4;
		const scaleName = (cfg.scaleName as string) ?? "major";
		const scales = cfg.scales as Record<string, number[]>;

		// Get semitones for this scale
		const semitones = scales[scaleName] ?? scales.major ?? [0, 2, 4, 5, 7, 9, 11];

		// Check if we need to rebuild the frequency table
		// Range determines how many octaves: integer part = full octaves, fractional = partial
		const cacheKey = `${scaleName}-${root}-${octave}-${range}`;
		if (state.cacheKey !== cacheKey) {
			state.cacheKey = cacheKey;
			const freqs: number[] = [];
			const rootMidi = 12 + octave * 12 + root;

			// Calculate octave span centered around the base octave
			const halfRange = range / 2;
			const startOct = Math.floor(-halfRange);
			const endOct = Math.ceil(halfRange);

			// Calculate semitone boundaries for fractional range
			const minSemi = rootMidi + startOct * 12;
			const maxSemi = rootMidi + range * 12 + startOct * 12;

			for (let oct = startOct; oct < endOct; oct++) {
				for (let i = 0; i < semitones.length; i++) {
					const semi = semitones[i];
					if (semi !== undefined) {
						const midi = rootMidi + oct * 12 + semi;
						// Only include notes within the range
						if (midi >= minSemi && midi <= maxSemi) {
							freqs.push(440 * Math.pow(2, (midi - 69) / 12));
						}
					}
				}
			}
			state.frequencies = freqs.sort((a, b) => a - b);
		}

		// Find nearest frequency
		const frequencies = state.frequencies as number[];
		let nearest = 440;
		let minDist = Infinity;
		for (let i = 0; i < frequencies.length; i++) {
			const freq = frequencies[i];
			if (freq !== undefined) {
				const dist = Math.abs(inputFreq - freq);
				if (dist < minDist) {
					minDist = dist;
					nearest = freq;
				}
			}
		}

		out.freq = nearest;
	},
});
