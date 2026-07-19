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

/** Pack a bank's per-line ring lengths into one contiguous buffer's offset/length tables. */
function packBank(
	tuning: readonly number[],
	scale: number,
): {
	off: Int32Array;
	len: Int32Array;
	total: number;
} {
	const len = Int32Array.from(tuning, (n) => Math.max(1, Math.round(n * scale)));
	const off = new Int32Array(len.length);
	let acc = 0;
	for (let i = 0; i < len.length; i++) {
		off[i] = acc;
		acc += len[i] as number;
	}
	return { off, len, total: acc };
}

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
		const comb = packBank(COMB_TUNING, scale);
		const ap = packBank(ALLPASS_TUNING, scale);
		return {
			// One contiguous ring per bank + int offset/length tables, so tick
			// indexes numerically (no per-sample template-string state lookups).
			combBuf: new Float32Array(comb.total),
			combOff: comb.off,
			combLen: comb.len,
			combIdx: new Int32Array(COMB_TUNING.length),
			combStore: new Float32Array(COMB_TUNING.length),
			apBuf: new Float32Array(ap.total),
			apOff: ap.off,
			apLen: ap.len,
			apIdx: new Int32Array(ALLPASS_TUNING.length),
		};
	},
	tick: (s, i, o) => {
		const combBuf = s.combBuf as Float32Array;
		const combOff = s.combOff as Int32Array;
		const combLen = s.combLen as Int32Array;
		const combIdx = s.combIdx as Int32Array;
		const combStore = s.combStore as Float32Array;
		const apBuf = s.apBuf as Float32Array;
		const apOff = s.apOff as Int32Array;
		const apLen = s.apLen as Int32Array;
		const apIdx = s.apIdx as Int32Array;

		const room = i.room;
		const damp = i.damp;
		const mix = i.mix;
		const input = i.in;
		const feedback = room * 0.28 + 0.7;

		let wet = 0;
		for (let c = 0; c < COMB_TUNING.length; c++) {
			const base = combOff[c] as number;
			const idx = combIdx[c] as number;
			const out = combBuf[base + idx] as number;
			const store = combStore[c] as number;
			const filtered = out * (1 - damp) + store * damp;
			combStore[c] = filtered;
			combBuf[base + idx] = input + filtered * feedback;
			const len = combLen[c] as number;
			combIdx[c] = idx + 1 === len ? 0 : idx + 1;
			wet += out;
		}
		wet *= 0.125;

		for (let a = 0; a < ALLPASS_TUNING.length; a++) {
			const base = apOff[a] as number;
			const idx = apIdx[a] as number;
			const buffered = apBuf[base + idx] as number;
			const apOut = buffered - wet;
			apBuf[base + idx] = wet + buffered * 0.5;
			const len = apLen[a] as number;
			apIdx[a] = idx + 1 === len ? 0 : idx + 1;
			wet = apOut;
		}

		o.out = wet * mix + input * (1 - mix);
	},
});
