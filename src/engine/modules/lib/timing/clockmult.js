/**
 * Clock multiplier, the rack way: `by` evenly spaced trigs per input period.
 * The period is the time between the last two input trigs, so it locks after
 * two; until then each input trig passes alone. Every input trig fires the
 * first of its group, and the next input trig cuts a late group short. The
 * outputs are single-sample trigs. `by` is rounded; below 1 counts as 1.
 */
defmod(
	"clockmult",
	{
		cat: "timing",
		doc: "Clock multiplier: n evenly spaced trigs per input period; locks after two trigs.",
		args: ["trig", "by"],
		outs: { out: trigPort() },
	},
	() => {
		let since = 0
		let period = 0
		let next = 1
		let seen = 0
		let lastTrig = 0
		return ({ trig = trigPort(0), by = sig(2) }) => {
			const byN = Math.max(1, Math.round(by))
			let fire = 0
			if (trig > 0.5 && lastTrig <= 0.5) {
				if (seen === 1) period = since
				seen = 1
				since = 0
				next = 1
				fire = 1
			} else if (seen === 1) {
				since = since + 1
				if (period > 0 && next < byN && since >= (next * period) / byN) {
					next = next + 1
					fire = 1
				}
			}
			lastTrig = trig
			return fire
		}
	},
)
