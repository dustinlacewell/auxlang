import { Scale } from "tonal";
import { device } from "../device/device";

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
 * Quantize a control signal into notes from a scale.
 *
 * Usage:
 *   noise().sin(.1, 0, 1)
 *     .quantize("minor pentatonic", $`c3`, $`c5`, 0, 1)
 *
 *  Low/high describe the frequency band to cover (e.g. base note + top note).
 *  Min/max describe the expected input range that should be mapped to that band.
 *  If min/max are omitted the raw input is interpreted as Hertz directly.
 */

export const quantize = device("quantize", {
	inputs: { input: 0, low: 220, high: 880, min: -1, max: 1 },
	config: { scales: SCALE_SEMITONES, scaleName: "major" },
	outputs: ["freq", "trig", "gate"],
	defaultInput: "input",
	defaultOutput: "freq",
	positionalArgs: ["scaleName", "low", "high", "min", "max"],
	process(inp, cfg, state, _sampleRate, _time, out) {
		const freqToMidi = (freq: number): number => 69 + 12 * Math.log2(freq / 440);
		const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

		const rawInput = inp.input;
		const lowFreq = Math.max(inp.low, 1);
		const highFreq = Math.max(inp.high, lowFreq + 1e-6);
		const scaleName = (cfg.scaleName as string) ?? "major";
		const scales = cfg.scales as Record<string, number[]>;
		const minInput = inp.min;
		const maxInput = inp.max;

		// Get semitones for this scale
		const semitones = scales[scaleName] ?? scales.major ?? [0, 2, 4, 5, 7, 9, 11];

		const minMidi = freqToMidi(lowFreq);
		const maxMidi = freqToMidi(highFreq);

		let inputFreq = rawInput;
		const shouldNormalize =
			minInput !== null &&
			maxInput !== null &&
			Number.isFinite(minInput) &&
			Number.isFinite(maxInput) &&
			maxInput !== minInput;
		if (shouldNormalize) {
			const normalized = Math.min(Math.max((rawInput - minInput) / (maxInput - minInput), 0), 1);
			const targetMidi = minMidi + normalized * (maxMidi - minMidi);
			inputFreq = midiToFreq(targetMidi);
		}

		// Check if we need to rebuild the frequency table
		const cacheKey = `${scaleName}-${lowFreq}-${highFreq}`;
		if (state.cacheKey !== cacheKey) {
			state.cacheKey = cacheKey;
			const freqs: number[] = [];
			const allowed = new Set(semitones.map((s) => ((s % 12) + 12) % 12));
			const rootMidi = Math.round(minMidi);

			for (let midi = Math.floor(minMidi); midi <= Math.ceil(maxMidi); midi++) {
				const rel = ((midi - rootMidi) % 12 + 12) % 12;
				if (allowed.has(rel)) {
					freqs.push(midiToFreq(midi));
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

		const prev = state.lastFreq as number | undefined;
		const changed = prev === undefined || Math.abs(prev - nearest) > 1e-6;
		state.lastFreq = nearest;
		const gate = changed ? 1 : ((state.gate as number | undefined) ?? 1);
		state.gate = gate;

		out.freq = nearest;
		out.trig = changed ? 1 : 0;
		out.gate = gate;
	},
});
