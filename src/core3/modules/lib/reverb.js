/**
 * Freeverb-style algorithmic reverb: 8 parallel damped comb filters summed,
 * then 4 series allpasses to diffuse the tail. Mono in, mono out — pan it (or
 * run two instances) for stereo width, same as every other core3 effect.
 * Comb/allpass delay lengths are the classic Freeverb tuning (in samples at
 * 44.1 kHz), rescaled to the actual sample rate in state().
 */
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
		const combTuning = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
		const allpassTuning = [556, 441, 341, 225];
		const scale = sr / 44100;
		/** Pack a bank's per-line ring lengths into one contiguous buffer's offset/length tables. */
		const packBank = (tuning) => {
			const len = Int32Array.from(tuning, (n) => Math.max(1, Math.round(n * scale)));
			const off = new Int32Array(len.length);
			let acc = 0;
			for (let k = 0; k < len.length; k++) {
				off[k] = acc;
				acc += len[k];
			}
			return { off, len, total: acc };
		};
		const comb = packBank(combTuning);
		const ap = packBank(allpassTuning);
		return {
			// One contiguous ring per bank + int offset/length tables, so tick
			// indexes numerically (no per-sample template-string state lookups).
			combBuf: new Float32Array(comb.total),
			combOff: comb.off,
			combLen: comb.len,
			combIdx: new Int32Array(combTuning.length),
			combStore: new Float32Array(combTuning.length),
			apBuf: new Float32Array(ap.total),
			apOff: ap.off,
			apLen: ap.len,
			apIdx: new Int32Array(allpassTuning.length),
		};
	},
	tick: (s, i, o) => {
		const combBuf = s.combBuf;
		const combOff = s.combOff;
		const combLen = s.combLen;
		const combIdx = s.combIdx;
		const combStore = s.combStore;
		const apBuf = s.apBuf;
		const apOff = s.apOff;
		const apLen = s.apLen;
		const apIdx = s.apIdx;

		const room = i.room;
		const damp = i.damp;
		const mix = i.mix;
		const input = i.in;
		const feedback = room * 0.28 + 0.7;

		let wet = 0;
		for (let c = 0; c < combLen.length; c++) {
			const base = combOff[c];
			const idx = combIdx[c];
			const out = combBuf[base + idx];
			const store = combStore[c];
			const filtered = out * (1 - damp) + store * damp;
			combStore[c] = filtered;
			combBuf[base + idx] = input + filtered * feedback;
			const len = combLen[c];
			combIdx[c] = idx + 1 === len ? 0 : idx + 1;
			wet += out;
		}
		wet *= 0.125;

		for (let a = 0; a < apLen.length; a++) {
			const base = apOff[a];
			const idx = apIdx[a];
			const buffered = apBuf[base + idx];
			const apOut = buffered - wet;
			apBuf[base + idx] = wet + buffered * 0.5;
			const len = apLen[a];
			apIdx[a] = idx + 1 === len ? 0 : idx + 1;
			wet = apOut;
		}

		o.out = wet * mix + input * (1 - mix);
	},
});
