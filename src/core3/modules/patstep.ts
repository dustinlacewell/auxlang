import { defineModule } from "../module/define";
import type { Pat } from "../pattern/ast";
import { stepValues } from "../pattern/step-values";
import { sig, trigPort } from "../types";

/**
 * patstep — analog step-sequencer semantics: the pattern advanced by TRIGGER,
 * not phase. The pattern's onset values are flattened once (stepValues) and
 * each rising edge on `trig` advances one value, wrapping; durations are
 * ignored. Output is 0 until the first trigger.
 */
export const patstep = defineModule({
	name: "patstep",
	ins: { trig: trigPort(0) },
	outs: { out: sig() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["trig"],
	config: { pattern: { op: "silence" }, seed: 1 },
	state: () => ({ primed: 0, values: new Float64Array(0), count: 0, idx: -1, value: 0, prev: 0 }),
	tick: (s, i, o, cfg) => {
		if ((s.primed as number) === 0) {
			const values = stepValues(cfg.pattern as Pat, (cfg.seed as number) | 0);
			s.values = values;
			s.count = values.length;
			s.primed = 1;
		}
		const trig = i.trig;
		if (trig > 0.5 && (s.prev as number) <= 0.5 && (s.count as number) > 0) {
			const idx = ((s.idx as number) + 1) % (s.count as number);
			s.idx = idx;
			s.value = (s.values as Float64Array)[idx] as number;
		}
		s.prev = trig;
		o.out = s.value as number;
	},
});
