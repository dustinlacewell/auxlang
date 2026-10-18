/**
 * The oscillator family (sin/saw/tri/sqr) and lfo, sharing one waveform
 * sampler.
 *
 * The osc family is pitch-first: positional signature is [pitch, min, max]
 * (MIDI semis), so `sin(69)`, `sin(p\`a4\`)`, and `seq(...).sin()` all mean
 * A440. An exact frequency is `sin(hz(440))` (the pitch port converts it).
 * `fm` (Hz) adds linearly to the frequency from `pitch` — linear FM.
 *
 * lfo is frequency-first: `lfo(0.3, 100, 800)` sweeps 100→800 at 0.3 Hz.
 * Shape is config: `lfo({ shape: "tri" })` — sin (default), saw, tri, or sqr.
 *
 * `phase` sets INITIAL phase only (seeded on first tick, not a running offset).
 * Output maps the [-1,1] waveform into [min,max].
 *
 * Band-limiting: saw and sqr use a 2-sample polyBLEP correction at each phase
 * discontinuity. tri is generated DIRECTLY from phase (exact unit amplitude,
 * zero DC, no warmup transient); a triangle's harmonics roll off 12 dB/oct so
 * naive generation aliases negligibly. (An integrated-square triangle was tried
 * and rejected: folding polyBLEP into the integrand injects amplitude overshoot,
 * and the DC-blocker needed to centre a raw integrator overshoots on startup.)
 * sin is naive (no discontinuity to band-limit).
 */

/** 2-sample polyBLEP residual around a phase discontinuity at t=0/1. */
function polyBLEP(t, dt) {
	if (t < dt) {
		const x = t / dt;
		return x + x - x * x - 1;
	}
	if (t > 1 - dt) {
		const x = (t - 1) / dt;
		return x * x + x + x + 1;
	}
	return 0;
}

/** One sample of waveform `shape` at `phase` in [0, 1), band-limited for step `dt`. */
function sample(shape, phase, dt) {
	if (shape === "sin") return Math.sin(phase * Math.PI * 2);
	if (shape === "saw") return 2 * phase - 1 - polyBLEP(phase, dt);
	if (shape === "sqr") {
		let sq = phase < 0.5 ? 1 : -1;
		sq += polyBLEP(phase, dt);
		sq -= polyBLEP((phase + 0.5) % 1, dt);
		return sq;
	}
	// tri: direct from phase — rises 0→0.5 as -1→+1, falls 0.5→1 as +1→-1.
	return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
}

for (const [name, shape, doc] of [
	["sin", "sin", "Sine oscillator."],
	["saw", "saw", "Sawtooth oscillator, band-limited."],
	["tri", "tri", "Triangle oscillator."],
	["sqr", "sqr", "Square oscillator, band-limited."],
]) {
	defmod(name, { cat: "sources", doc, args: ["pitch", "min", "max"], config: { shape } }, ({ sr, shape }) => {
		let phase = 0
		let started = 0
		return ({ pitch = semis(69), fm = hz(0), min = -1, max = 1, phase: phaseIn = unit(0) }) => {
			if (started === 0) {
				phase = ((phaseIn % 1) + 1) % 1
				started = 1
			}
			const freq = semisToHz(pitch) + fm
			const dt = Math.min(0.5, Math.abs(freq) / sr)
			const raw = sample(shape, phase, dt)
			let next = phase + freq / sr
			next -= Math.floor(next)
			phase = next
			return min + ((raw + 1) / 2) * (max - min)
		}
	})
}

defmod(
	"lfo",
	{ cat: "sources", doc: "LFO; frequency-first (Hz), shape via config (sin default).", args: ["freq", "min", "max"], config: { shape: "sin" } },
	({ sr, shape }) => {
		let phase = 0
		let started = 0
		return ({ freq = hz(1), min = -1, max = 1, phase: phaseIn = unit(0) }) => {
			if (started === 0) {
				phase = ((phaseIn % 1) + 1) % 1
				started = 1
			}
			const dt = Math.min(0.5, Math.abs(freq) / sr)
			const raw = sample(shape, phase, dt)
			let next = phase + freq / sr
			next -= Math.floor(next)
			phase = next
			return min + ((raw + 1) / 2) * (max - min)
		}
	},
)
