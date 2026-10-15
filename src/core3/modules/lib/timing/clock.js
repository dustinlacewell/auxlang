/**
 * Clock (MANIFESTO §4.2): integrates a position in bars (cycles) from `bpm`
 * beats per minute and `config.beatsPerBar` beats per bar. Tempo is an input,
 * so tempo modulation is patching. Outputs:
 *
 *   out   position in bars, unbounded — what seq reads
 *   beat  single-sample trig at each beat
 *   bar   single-sample trig at each bar
 *
 * Both trigs fire on the first sample. The meter is read every tick, never
 * cached in state.
 */
defmod({
	name: "clock",
	category: "timing",
	doc: "A position in bars at a tempo; outputs position, beat trig, and bar trig.",
	ins: { bpm: sig(120) },
	outs: { out: phasePort(), beat: trigPort(), bar: trigPort() },
	defaultIn: "bpm",
	defaultOut: "out",
	positional: ["bpm"],
	config: { beatsPerBar: 4 },
	state: () => ({ pos: 0, lastBeat: -1, lastBar: -1 }),
	tick: (s, i, o, cfg, sr) => {
		const beatsPerBar = cfg.beatsPerBar;
		const pos = s.pos + i.bpm / 60 / sr / beatsPerBar;
		const bar = Math.floor(pos);
		const beat = Math.floor(pos * beatsPerBar);
		o.out = pos;
		o.beat = beat !== s.lastBeat ? 1 : 0;
		o.bar = bar !== s.lastBar ? 1 : 0;
		s.pos = pos;
		s.lastBeat = beat;
		s.lastBar = bar;
	},
});
