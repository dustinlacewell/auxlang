import { defmod } from "../patch/defmod";
import type { Pat } from "../pattern/ast";
import type { Ev } from "../pattern/event";
import { query } from "../pattern/query";
import { r, rcmp } from "../pattern/rational";
import { phasePort, sig } from "../types";
import { advanceTrack, fillTrack, trackStateFields } from "./pattern-track";

/**
 * patsig — a pattern used as a control signal. Pattern lifting (compile's
 * expand-patterns) creates these nodes, wired to the ambient clock's phase.
 * Per cycle it queries `config.pattern` and sample-and-holds the value of the
 * most recently started event; gaps hold the last value, and before the first
 * event EVER the output is 0.
 */
defmod({
	name: "patsig",
	category: "bridge",
	doc: "A pattern queried at the clock's phase, sample-and-held; created automatically when a pattern feeds a port.",
	ins: { phase: phasePort(0) },
	outs: { out: sig() },
	defaultIn: "phase",
	defaultOut: "out",
	config: { pattern: { op: "silence" }, seed: 1 },
	state: () => ({ ...trackStateFields(), value: 0 }),
	tick: (s, i, o, cfg) => {
		const phase = i.phase;
		const cycle = Math.floor(phase);
		if ((s.primed as number) === 0 || cycle !== (s.cycle as number)) {
			const evs = query(
				cfg.pattern as Pat,
				{ begin: r(cycle), end: r(cycle + 1) },
				{ seed: (cfg.seed as number) | 0, path: 0 },
			).sort((a: Ev, b: Ev) => rcmp(a.part.begin, b.part.begin));
			fillTrack(s, evs);
			s.cycle = cycle;
			s.primed = 1;
		}

		advanceTrack(s, phase);
		const idx = s.idx as number;
		if (idx > 0) s.value = (s.evVal as Float64Array)[idx - 1] as number;
		o.out = s.value as number;
	},
});
