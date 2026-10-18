/**
 * Counter (MANIFESTO §4.2): counts rising edges on `trig` into a step
 * position for seq to read. The first trig holds step 0, so a seq reading
 * the counter starts on its first step and each later trig moves one step.
 * A rising edge on `reset` returns to the start: step 0, and the next trig
 * holds it. `config.length` > 0 wraps the count; 0 counts without bound.
 */
defmod(
	"counter",
	{
		cat: "timing",
		doc: "Counts triggers into a step position; the first trig holds step 0.",
		args: ["trig"],
		outs: { out: phasePort() },
	},
	({ length = 0 }) => {
		let count = -1
		let lastTrig = 0
		let lastReset = 0
		return ({ trig = trigPort(0), reset = trigPort(0) }) => {
			const lengthN = length | 0
			if (reset > 0.5 && lastReset <= 0.5) count = -1
			if (trig > 0.5 && lastTrig <= 0.5) {
				count = lengthN > 0 ? (count + 1) % lengthN : count + 1
			}
			const out = count < 0 ? 0 : count
			lastTrig = trig
			lastReset = reset
			return out
		}
	},
)
