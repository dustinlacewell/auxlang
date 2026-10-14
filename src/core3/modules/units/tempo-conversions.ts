import { defmod } from "../../patch/defmod";
import { phasePort } from "../../types";
import { beats, secs } from "../../units/tag";

/**
 * Per-sample beats↔secs converters, resolved against the governing clock. A
 * port inserts one when a `beats(x)`/`secs(x)` value meets a port of the other
 * unit. `clk` is left unconnected, so compile wires it to the ambient clock's
 * phase (no clock is a loud error). The tempo is read from the observed
 * per-sample phase increment, so the time follows the clock. Until the clock
 * advances, a beat is 0.5 s (120 BPM).
 */

/** Seconds per beat from the clock's phase step this sample; held while the clock stands still. */
function trackSecsPerBeat(s: Record<string, unknown>, clk: number, sr: number): number {
	const step = clk - (s.lastPhase as number);
	s.lastPhase = clk;
	if (step > 0) s.secsPerBeat = 1 / (step * sr);
	return s.secsPerBeat as number;
}

const tempoState = () => ({ lastPhase: 0, secsPerBeat: 0.5 });

defmod({
	name: "beats2secs",
	category: "utils",
	doc: "Converts beats to seconds at the clock's tempo. Inserted when beats(x) feeds a seconds port.",
	ins: { in: beats(1), clk: phasePort(0) },
	outs: { out: secs(0.5) },
	defaultIn: "in",
	defaultOut: "out",
	state: tempoState,
	tick: (s, i, o, _cfg, sr) => {
		o.out = i.in * trackSecsPerBeat(s, i.clk, sr);
	},
});

defmod({
	name: "secs2beats",
	category: "utils",
	doc: "Converts seconds to beats at the clock's tempo. Inserted when secs(x) feeds a beats port.",
	ins: { in: secs(0.5), clk: phasePort(0) },
	outs: { out: beats(1) },
	defaultIn: "in",
	defaultOut: "out",
	state: tempoState,
	tick: (s, i, o, _cfg, sr) => {
		o.out = i.in / trackSecsPerBeat(s, i.clk, sr);
	},
});
