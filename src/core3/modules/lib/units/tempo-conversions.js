/**
 * Per-sample beats↔secs converters, resolved against the governing clock: a
 * beat lasts 60/bpm seconds. A port inserts one when a `beats(x)`/`secs(x)`
 * value meets a port of the other unit. `clk` is left unconnected, so compile
 * wires it to the ambient clock's position (in bars; no clock is a loud error)
 * and copies the clock's meter into `config.beatsPerBar`
 * (compile/copy-meter.ts). The tempo is read from the observed per-sample
 * position step, so the time follows the clock. Until the clock advances, a
 * beat is 0.5 s (120 BPM).
 */

/** Seconds per beat for one sample's position `step`; `held` while the clock stands still. */
function secsPerBeat(step, beatsPerBar, sr, held) {
	return step > 0 ? 1 / (step * beatsPerBar * sr) : held;
}

const converter = {
	category: "utils",
	defaultIn: "in",
	defaultOut: "out",
	config: { beatsPerBar: 4 },
	state: () => ({ lastPhase: 0, secsPerBeat: 0.5 }),
	helpers: { secsPerBeat },
};

defmod({
	...converter,
	name: "beats2secs",
	doc: "Converts beats to seconds at the clock's tempo. Inserted when beats(x) feeds a seconds port.",
	ins: { in: beats(1), clk: phasePort(0) },
	outs: { out: secs(0.5) },
	tick: (s, i, o, cfg, sr) => {
		const step = i.clk - s.lastPhase;
		s.lastPhase = i.clk;
		s.secsPerBeat = secsPerBeat(step, cfg.beatsPerBar, sr, s.secsPerBeat);
		o.out = i.in * s.secsPerBeat;
	},
});

defmod({
	...converter,
	name: "secs2beats",
	doc: "Converts seconds to beats at the clock's tempo. Inserted when secs(x) feeds a beats port.",
	ins: { in: secs(0.5), clk: phasePort(0) },
	outs: { out: beats(1) },
	tick: (s, i, o, cfg, sr) => {
		const step = i.clk - s.lastPhase;
		s.lastPhase = i.clk;
		s.secsPerBeat = secsPerBeat(step, cfg.beatsPerBar, sr, s.secsPerBeat);
		o.out = i.in / s.secsPerBeat;
	},
});
