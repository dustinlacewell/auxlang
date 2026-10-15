import { defmod } from "../patch/defmod";
import { phasePort, trigPort } from "../types";

/**
 * Counter (MANIFESTO §4.2): counts rising edges on `trig` into a step
 * position for seq to read. The first trig holds step 0, so a seq reading
 * the counter starts on its first step and each later trig moves one step.
 * A rising edge on `reset` returns to the start: step 0, and the next trig
 * holds it. `config.length` > 0 wraps the count; 0 counts without bound.
 */
defmod({
	name: "counter",
	category: "timing",
	doc: "Counts triggers into a step position; the first trig holds step 0.",
	ins: { trig: trigPort(0), reset: trigPort(0) },
	outs: { out: phasePort() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["trig"],
	config: { length: 0 },
	state: () => ({ count: -1, lastTrig: 0, lastReset: 0 }),
	tick: (s, i, o, cfg) => {
		const length = (cfg.length as number) | 0;
		let count = s.count as number;
		if (i.reset > 0.5 && (s.lastReset as number) <= 0.5) count = -1;
		if (i.trig > 0.5 && (s.lastTrig as number) <= 0.5) {
			count = length > 0 ? (count + 1) % length : count + 1;
		}
		o.out = count < 0 ? 0 : count;
		s.count = count;
		s.lastTrig = i.trig;
		s.lastReset = i.reset;
	},
});
