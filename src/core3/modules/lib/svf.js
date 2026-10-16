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
	defmod(name, { cat: "filters", doc, config: { mode } }, ({ sr, mode }) => {
		let ic1 = 0
		let ic2 = 0
		let lastCut = -1
		let lastRes = -1
		let a1 = 0
		let a2 = 0
		let a3 = 0
		let k = 0
		return ({ in: x = 0, cutoff = semis(84), res = unit(0) }) => {
			if (cutoff !== lastCut || res !== lastRes) {
				const freq = Math.min(semisToHz(cutoff), 0.49 * sr)
				const g = Math.tan((Math.PI * freq) / sr)
				k = 1 / (0.5 + res * 9.5)
				a1 = 1 / (1 + g * (g + k))
				a2 = g * a1
				a3 = g * (g * a1)
				lastCut = cutoff
				lastRes = res
			}
			const v0 = x
			const v3 = v0 - ic2
			const v1 = a1 * ic1 + a2 * v3
			const v2 = ic2 + a2 * ic1 + a3 * v3
			ic1 = 2 * v1 - ic1
			ic2 = 2 * v2 - ic2
			const lp = v2
			const bp = v1
			const hp = v0 - k * v1 - v2
			return mode === "lp" ? lp : mode === "hp" ? hp : mode === "bp" ? bp : lp + hp // notch
		}
	})
}
