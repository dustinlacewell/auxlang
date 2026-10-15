/**
 * Clock divider, the rack way: passes every `by`-th trig. The first trig
 * passes, then every `by`-th after it, so a divided beat lands on the
 * downbeat. A passed pulse goes through as it came in (a trig stays a trig, a
 * gate stays a gate). `by` is read on each rising edge and rounded; below 1
 * counts as 1. A rising edge on `reset` makes the next trig pass; reset is
 * read before trig, so a reset and a trig on the same sample pass that trig.
 */
defmod({
	name: "clockdiv",
	category: "timing",
	doc: "Clock divider: passes every nth trig; the first trig passes.",
	ins: { trig: trigPort(0), by: sig(4), reset: trigPort(0) },
	outs: { out: trigPort() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["trig", "by"],
	state: () => ({ since: -1, passing: 0, lastTrig: 0, lastReset: 0 }),
	tick: (s, i, o) => {
		if (i.reset > 0.5 && s.lastReset <= 0.5) s.since = -1;
		if (i.trig > 0.5 && s.lastTrig <= 0.5) {
			const by = Math.max(1, Math.round(i.by));
			const passes = s.since < 0 || s.since + 1 >= by;
			s.since = passes ? 0 : s.since + 1;
			s.passing = passes ? 1 : 0;
		}
		o.out = i.trig > 0.5 && s.passing === 1 ? 1 : 0;
		s.lastTrig = i.trig;
		s.lastReset = i.reset;
	},
});
