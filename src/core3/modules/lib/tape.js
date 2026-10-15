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

defmod({
	name: "tape",
	category: "effects",
	doc: "Tape echo — saturation, wow and flutter, darkening repeats.",
	ins: {
		in: sig(0),
		time: secs(0.3),
		feedback: unit(0.4),
		mix: unit(0.35),
		drive: unit(0.3),
		wow: unit(0.2),
		flutter: unit(0.2),
		tone: unit(0.6),
	},
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["time", "feedback", "mix"],
	state: (sr) => {
		const maxSecs = 4;
		const n = Math.ceil((maxSecs + 0.01) * sr) + 2;
		// Head bump: an RBJ peaking biquad, +2 dB at 100 Hz, Q 0.8.
		const amp = 10 ** (2 / 40);
		const w0 = (2 * Math.PI * 100) / sr;
		const alpha = Math.sin(w0) / (2 * 0.8);
		const a0 = 1 + alpha / amp;
		return {
			buf: new Float32Array(n),
			w: 0,
			maxSecs,
			maxDelay: n - 2,
			started: 0,
			wowPhase: 0,
			flutterPhase: 0,
			jitter: 0,
			jitterTarget: 0,
			jitterLeft: 0,
			jitterCoef: 1 - Math.exp((-2 * Math.PI * 12) / sr),
			b0: (1 + alpha * amp) / a0,
			b1: (-2 * Math.cos(w0)) / a0,
			b2: (1 - alpha * amp) / a0,
			a1: (-2 * Math.cos(w0)) / a0,
			a2: (1 - alpha / amp) / a0,
			z1: 0,
			z2: 0,
			hfCoef: 1 - Math.exp((-2 * Math.PI * 8000) / sr),
			hf: 0,
			lp: 0,
		};
	},
	helpers: { saturate, readHead },
	tick: (s, i, o, _cfg, sr) => {
		const WOW_HZ = 0.8;
		const FLUTTER_HZ = 9;
		const WOW_SECS = 0.004;
		const FLUTTER_SECS = 0.00015;
		if (s.started === 0) {
			s.wowPhase = Math.random();
			s.flutterPhase = Math.random();
			s.started = 1;
		}

		// Playhead: time plus wow and flutter, in samples behind the record head.
		if (s.jitterLeft <= 0) {
			s.jitterTarget = Math.random() * 2 - 1;
			s.jitterLeft = Math.floor(sr / 16);
		}
		s.jitterLeft = s.jitterLeft - 1;
		s.jitter = s.jitter + (s.jitterTarget - s.jitter) * s.jitterCoef;
		const wow = Math.max(0, Math.min(1, i.wow)) * WOW_SECS;
		const flutter = Math.max(0, Math.min(1, i.flutter)) * FLUTTER_SECS;
		const wobble =
			wow * Math.sin(2 * Math.PI * s.wowPhase) +
			flutter * (0.7 * Math.sin(2 * Math.PI * s.flutterPhase) + 0.5 * s.jitter);
		s.wowPhase = (s.wowPhase + WOW_HZ / sr) % 1;
		s.flutterPhase = (s.flutterPhase + FLUTTER_HZ / sr) % 1;
		const time = Math.max(0, Math.min(s.maxSecs, i.time));
		const d = Math.max(1, Math.min(s.maxDelay, (time + wobble) * sr));
		const played = readHead(s.buf, s.w, d);

		// Playback EQ: head bump, then high-frequency loss.
		const bumped = s.b0 * played + s.z1;
		s.z1 = s.b1 * played - s.a1 * bumped + s.z2;
		s.z2 = s.b2 * played - s.a2 * bumped;
		s.hf = s.hf + (bumped - s.hf) * s.hfCoef;
		const wet = s.hf;

		// Feedback, damped by tone, recorded through the saturator.
		const tone = Math.max(0, Math.min(1, i.tone));
		let fed = wet;
		if (tone < 1) {
			const cutoff = 200 * 100 ** tone;
			s.lp = s.lp + (wet - s.lp) * (1 - Math.exp((-2 * Math.PI * cutoff) / sr));
			fed = s.lp;
		} else {
			s.lp = wet;
		}
		const feedback = Math.max(0, Math.min(1, i.feedback));
		const k = 0.5 * 6 ** Math.max(0, Math.min(1, i.drive));
		s.buf[s.w] = saturate(i.in + fed * feedback, k);
		s.w = (s.w + 1) % s.buf.length;

		const mix = Math.max(0, Math.min(1, i.mix));
		o.out = i.in * (1 - mix) + wet * mix;
	},
});
