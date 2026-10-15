/**
 * State-variable filter (lpf/hpf/bpf/notch) — ONE Zavalishin/TPT core, four mode
 * wrappers selecting which of the {lp, bp, hp} taps (or the notch = lp+hp sum)
 * to emit.
 *
 * res→Q is a single shared mapping: Q = 0.5 + res*9.5 (res 0 → Q 0.5, res 1 → Q 10).
 * res defaults to 0: no peak, so gain never exceeds unity unless asked. A peak
 * above unity in a loop() feedback path makes the loop run away.
 * cutoff is in semitones (MIDI numbering, 69 = A440; `hz(800)` converts), so a
 * sweep is even to the ear and keytracking is `s.add(n)`. Its frequency is
 * clamped to 0.49*sr. Coefficients (g, k, a1, a2, a3) are recomputed only when
 * cutoff or res changed since the last sample (cached in state).
 */
for (const [name, mode, doc] of [
	["lpf", "lp", "Low-pass filter."],
	["hpf", "hp", "High-pass filter."],
	["bpf", "bp", "Band-pass filter."],
	["notch", "notch", "Notch filter — cuts a band, passes the rest."],
]) {
	defmod({
		name,
		category: "filters",
		doc,
		ins: { in: sig(0), cutoff: semis(84), res: unit(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["cutoff", "res"],
		config: { mode },
		state: () => ({ ic1: 0, ic2: 0, lastCut: -1, lastRes: -1, a1: 0, a2: 0, a3: 0, k: 0 }),
		helpers: { semisToHz },
		tick: (s, i, o, cfg, sr) => {
			const cutoff = i.cutoff;
			const res = i.res;
			if (cutoff !== s.lastCut || res !== s.lastRes) {
				const freq = Math.min(semisToHz(cutoff), 0.49 * sr);
				const g = Math.tan((Math.PI * freq) / sr);
				const k = 1 / (0.5 + res * 9.5);
				const a1 = 1 / (1 + g * (g + k));
				s.k = k;
				s.a1 = a1;
				s.a2 = g * a1;
				s.a3 = g * (g * a1);
				s.lastCut = cutoff;
				s.lastRes = res;
			}
			const ic1 = s.ic1;
			const ic2 = s.ic2;
			const a1 = s.a1;
			const a2 = s.a2;
			const a3 = s.a3;
			const v0 = i.in;
			const v3 = v0 - ic2;
			const v1 = a1 * ic1 + a2 * v3;
			const v2 = ic2 + a2 * ic1 + a3 * v3;
			s.ic1 = 2 * v1 - ic1;
			s.ic2 = 2 * v2 - ic2;
			const lp = v2;
			const bp = v1;
			const hp = v0 - s.k * v1 - v2;
			o.out = cfg.mode === "lp" ? lp : cfg.mode === "hp" ? hp : cfg.mode === "bp" ? bp : lp + hp; // notch
		},
	});
}
