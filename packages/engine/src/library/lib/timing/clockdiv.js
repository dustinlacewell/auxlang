/**
 * Clock divider, the rack way: passes every `by`-th trig. The first trig
 * passes, then every `by`-th after it, so a divided beat lands on the
 * downbeat. A passed pulse goes through as it came in (a trig stays a trig, a
 * gate stays a gate). `by` is read on each rising edge and rounded; below 1
 * counts as 1. A rising edge on `reset` makes the next trig pass; reset is
 * read before trig, so a reset and a trig on the same sample pass that trig.
 */
defmod(
	"clockdiv",
	{
		cat: "timing",
		doc: "Clock divider: passes every nth trig; the first trig passes.",
		args: ["trig", "by"],
		outs: { out: trigPort() },
	},
	() => {
		let since = -1
		let passing = 0
		let lastTrig = 0
		let lastReset = 0
		return ({ trig = trigPort(0), by = sig(4), reset = trigPort(0) }) => {
			if (reset > 0.5 && lastReset <= 0.5) since = -1
			if (trig > 0.5 && lastTrig <= 0.5) {
				const byN = Math.max(1, Math.round(by))
				const passes = since < 0 || since + 1 >= byN
				since = passes ? 0 : since + 1
				passing = passes ? 1 : 0
			}
			const out = trig > 0.5 && passing === 1 ? 1 : 0
			lastTrig = trig
			lastReset = reset
			return out
		}
	},
)
