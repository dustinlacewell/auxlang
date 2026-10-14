import { defmod } from "../patch/defmod";
import type { Pat } from "../pattern/ast";
import { laneEvents } from "../pattern/lane-events";
import { query } from "../pattern/query";
import { r } from "../pattern/rational";
import { gatePort, phasePort, trigPort } from "../types";
import { semis } from "../units/tag";
import { advanceTrack, fillTrack, trackStateFields } from "./pattern-track";

/**
 * seq — the pattern→signal bridge. ONE node, one lane per voice (the seq
 * factory wraps the pattern in `voices` and pins the width to its lane count);
 * `config.pattern` is Pat DATA, `config.seed` the program seed. Each cycle
 * (= floor of the clock phase, in beats) the lane queries the pattern and
 * caches the events whose lane is its engine-injected `state.__lane`. Lanes
 * come from pattern structure, so a held note keeps its lane across cycles.
 *
 * Outputs, all pure functions of (pattern, phase, seed) — scrub-safe:
 *   pitch  semitones, sample-and-held per event; holds the last value through rests
 *   gate   1 while the event sounds, minus a fixed 1 ms pre-release gap
 *          (tempo-independent) unless the event ties onward
 *   trig   single-sample 1 at each non-tied onset (tiePrev suppresses)
 */
defmod({
	name: "seq",
	category: "timing",
	doc: "Plays a pattern against the clock; outputs pitch, gate, and trig.",
	ins: { clk: phasePort(0) },
	outs: { pitch: semis(0), gate: gatePort(), trig: trigPort() },
	defaultIn: "clk",
	defaultOut: "pitch",
	positional: ["clk"],
	config: { pattern: { op: "silence" }, seed: 1 },
	state: () => ({ ...trackStateFields(), value: 0, lastPhase: 0 }),
	tick: (s, i, o, cfg, sr) => {
		const phase = i.clk;
		const cycle = Math.floor(phase);
		if ((s.primed as number) === 0 || cycle !== (s.cycle as number)) {
			const evs = query(
				cfg.pattern as Pat,
				{ begin: r(cycle), end: r(cycle + 1) },
				{ seed: (cfg.seed as number) | 0, path: 0 },
			);
			const lane = (s.__lane as number | undefined) ?? 0;
			fillTrack(s, laneEvents(evs, lane));
			s.cycle = cycle;
			s.primed = 1;
		}

		const entered = advanceTrack(s, phase);
		const idx = s.idx as number;
		if (idx > 0) s.value = (s.evVal as Float64Array)[idx - 1] as number;

		// 1 ms in beats, from the observed per-sample phase increment.
		const gapBeats = 0.001 * sr * Math.max(phase - (s.lastPhase as number), 0);
		let gate = 0;
		if (idx > 0) {
			const start = (s.evStart as Float64Array)[idx - 1] as number;
			const end = (s.evEnd as Float64Array)[idx - 1] as number;
			const held = (s.evHold as Int8Array)[idx - 1] === 1;
			const gateEnd = held ? end : Math.max(start, end - gapBeats);
			if (phase < gateEnd) gate = 1;
		}

		o.pitch = s.value as number;
		o.gate = gate;
		o.trig = entered;
		s.lastPhase = phase;
	},
});
