import { defmod } from "../patch/defmod";
import { sig, unit } from "../types";

/**
 * Freeverb-style algorithmic reverb: 8 parallel damped comb filters summed,
 * then 4 series allpasses to diffuse the tail. Mono in, mono out — pan it (or
 * run two instances) for stereo width, same as every other core3 effect.
 * Comb/allpass delay lengths are the classic Freeverb tuning (in samples at
 * 44.1 kHz), rescaled to the actual sample rate in state().
 */
const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING = [556, 441, 341, 225];
const BASE_SR = 44100;

defmod({
	name: "reverb",
	category: "effects",
	doc: "Algorithmic reverb (Freeverb) — room size, damping, wet/dry mix.",
	ins: { in: sig(0), room: unit(0.5), damp: unit(0.5), mix: unit(0.33) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["room", "damp", "mix"],
	state: (sr) => {
		const scale = sr / BASE_SR;
		const fields: Record<string, unknown> = {
			combIdx: new Int32Array(COMB_TUNING.length),
			combStore: new Float32Array(COMB_TUNING.length),
			apIdx: new Int32Array(ALLPASS_TUNING.length),
		};
		COMB_TUNING.forEach((n, c) => {
			fields[`comb${c}`] = new Float32Array(Math.max(1, Math.round(n * scale)));
		});
		ALLPASS_TUNING.forEach((n, a) => {
			fields[`ap${a}`] = new Float32Array(Math.max(1, Math.round(n * scale)));
		});
		return fields;
	},
	tick: (s, i, o) => {
		const combIdx = s.combIdx as Int32Array;
		const combStore = s.combStore as Float32Array;
		const apIdx = s.apIdx as Int32Array;

		const room = i.room;
		const damp = i.damp;
		const mix = i.mix;
		const input = i.in;
		const feedback = room * 0.28 + 0.7;

		let wet = 0;
		for (let c = 0; c < COMB_TUNING.length; c++) {
			const buf = s[`comb${c}`] as Float32Array;
			const idx = combIdx[c] as number;
			const out = buf[idx] as number;
			const store = combStore[c] as number;
			const filtered = out * (1 - damp) + store * damp;
			combStore[c] = filtered;
			buf[idx] = input + filtered * feedback;
			combIdx[c] = (idx + 1) % buf.length;
			wet += out;
		}
		wet *= 0.125;

		for (let a = 0; a < ALLPASS_TUNING.length; a++) {
			const buf = s[`ap${a}`] as Float32Array;
			const idx = apIdx[a] as number;
			const buffered = buf[idx] as number;
			const apOut = buffered - wet;
			buf[idx] = wet + buffered * 0.5;
			apIdx[a] = (idx + 1) % buf.length;
			wet = apOut;
		}

		o.out = wet * mix + input * (1 - mix);
	},
});
