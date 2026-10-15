/**
 * Clock multiplier, the rack way: `by` evenly spaced trigs per input period.
 * The period is the time between the last two input trigs, so it locks after
 * two; until then each input trig passes alone. Every input trig fires the
 * first of its group, and the next input trig cuts a late group short. The
 * outputs are single-sample trigs. `by` is rounded; below 1 counts as 1.
 */
defmod({
	name: "clockmult",
	category: "timing",
	doc: "Clock multiplier: n evenly spaced trigs per input period; locks after two trigs.",
	ins: { trig: trigPort(0), by: sig(2) },
	outs: { out: trigPort() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["trig", "by"],
	state: () => ({ since: 0, period: 0, next: 1, seen: 0, lastTrig: 0 }),
	tick: (s, i, o) => {
		const by = Math.max(1, Math.round(i.by));
		let fire = 0;
		if (i.trig > 0.5 && s.lastTrig <= 0.5) {
			if (s.seen === 1) s.period = s.since;
			s.seen = 1;
			s.since = 0;
			s.next = 1;
			fire = 1;
		} else if (s.seen === 1) {
			s.since = s.since + 1;
			if (s.period > 0 && s.next < by && s.since >= (s.next * s.period) / by) {
				s.next = s.next + 1;
				fire = 1;
			}
		}
		o.out = fire;
		s.lastTrig = i.trig;
	},
});
