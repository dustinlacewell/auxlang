/**
 * Tape echo. The input (plus the feedback) is driven into a tanh saturator
 * and recorded onto a loop of tape; a playhead `time` seconds behind the
 * record head plays it back. Wow (a slow 0.8 Hz drift) and flutter (a fast
 * 9 Hz wobble plus a smoothed seeded-random jitter, so it is not a pure LFO)
 * move the playhead, which bends the pitch of the repeats. The playback runs
 * through a gentle head bump (+2 dB at 100 Hz) and a high-frequency loss
 * (one pole at 8 kHz). `tone` damps the feedback the way delay's does (200 Hz
 * at 0, out of the loop at 1). `mix` blends the dry input with the playback.
 *
 * The saturator has unity small-signal gain at every drive, so quiet signals
 * pass clean and drive only rounds loud ones; it bounds what reaches the tape,
 * so feedback 1 can build up but never runs away. The playhead reads with the
 * same linear interpolation as delay. Wow and flutter start at a random phase,
 * and the jitter draws from the lane's seeded stream: two tapes differ, the
 * same seed reproduces.
 */

/** Soft saturation, unity gain for small signals: tanh(k·x)/k, bounded by 1/k. */
function saturate(x, k) {
	return Math.tanh(k * x) / k;
}

/** Linear-interpolated read `d` samples behind write index `w` (delay's read). */
function readHead(buf, w, d) {
	const n = buf.length;
	const i0 = Math.floor(d);
	const frac = d - i0;
	let a = w - i0;
	let b = a - 1;
	a = ((a % n) + n) % n;
	b = ((b % n) + n) % n;
	return (buf[a] ?? 0) * (1 - frac) + (buf[b] ?? 0) * frac;
}

defmod(
	"tape",
	{ cat: "effects", doc: "Tape echo — saturation, wow and flutter, darkening repeats.", args: ["time", "feedback", "mix"] },
	({ sr }) => {
		const maxSecs = 4
		const n = Math.ceil((maxSecs + 0.01) * sr) + 2
		const maxDelay = n - 2
		const buf = new Float32Array(n)
		let w = 0
		let started = 0
		let wowPhase = 0
		let flutterPhase = 0
		let jitter = 0
		let jitterTarget = 0
		let jitterLeft = 0
		const jitterCoef = 1 - Math.exp((-2 * Math.PI * 12) / sr)
		// Head bump: an RBJ peaking biquad, +2 dB at 100 Hz, Q 0.8.
		const amp = 10 ** (2 / 40)
		const w0 = (2 * Math.PI * 100) / sr
		const alpha = Math.sin(w0) / (2 * 0.8)
		const a0 = 1 + alpha / amp
		const b0 = (1 + alpha * amp) / a0
		const b1 = (-2 * Math.cos(w0)) / a0
		const b2 = (1 - alpha * amp) / a0
		const a1 = (-2 * Math.cos(w0)) / a0
		const a2 = (1 - alpha / amp) / a0
		let z1 = 0
		let z2 = 0
		const hfCoef = 1 - Math.exp((-2 * Math.PI * 8000) / sr)
		let hf = 0
		let lp = 0

		return ({
			in: x = 0,
			time = secs(0.3),
			feedback = unit(0.4),
			mix = unit(0.35),
			drive = unit(0.3),
			wow = unit(0.2),
			flutter = unit(0.2),
			tone = unit(0.6),
		}) => {
			const WOW_HZ = 0.8
			const FLUTTER_HZ = 9
			const WOW_SECS = 0.004
			const FLUTTER_SECS = 0.00015
			if (started === 0) {
				wowPhase = Math.random()
				flutterPhase = Math.random()
				started = 1
			}

			// Playhead: time plus wow and flutter, in samples behind the record head.
			if (jitterLeft <= 0) {
				jitterTarget = Math.random() * 2 - 1
				jitterLeft = Math.floor(sr / 16)
			}
			jitterLeft = jitterLeft - 1
			jitter = jitter + (jitterTarget - jitter) * jitterCoef
			const wowClamped = Math.max(0, Math.min(1, wow)) * WOW_SECS
			const flutterClamped = Math.max(0, Math.min(1, flutter)) * FLUTTER_SECS
			const wobble =
				wowClamped * Math.sin(2 * Math.PI * wowPhase) +
				flutterClamped * (0.7 * Math.sin(2 * Math.PI * flutterPhase) + 0.5 * jitter)
			wowPhase = (wowPhase + WOW_HZ / sr) % 1
			flutterPhase = (flutterPhase + FLUTTER_HZ / sr) % 1
			const timeClamped = Math.max(0, Math.min(maxSecs, time))
			const d = Math.max(1, Math.min(maxDelay, (timeClamped + wobble) * sr))
			const played = readHead(buf, w, d)

			// Playback EQ: head bump, then high-frequency loss.
			const bumped = b0 * played + z1
			z1 = b1 * played - a1 * bumped + z2
			z2 = b2 * played - a2 * bumped
			hf = hf + (bumped - hf) * hfCoef
			const wet = hf

			// Feedback, damped by tone, recorded through the saturator.
			const toneClamped = Math.max(0, Math.min(1, tone))
			let fed = wet
			if (toneClamped < 1) {
				const cutoff = 200 * 100 ** toneClamped
				lp = lp + (wet - lp) * (1 - Math.exp((-2 * Math.PI * cutoff) / sr))
				fed = lp
			} else {
				lp = wet
			}
			const feedbackClamped = Math.max(0, Math.min(1, feedback))
			const k = 0.5 * 6 ** Math.max(0, Math.min(1, drive))
			buf[w] = saturate(x + fed * feedbackClamped, k)
			w = (w + 1) % buf.length

			const mixClamped = Math.max(0, Math.min(1, mix))
			return x * (1 - mixClamped) + wet * mixClamped
		}
	},
)
