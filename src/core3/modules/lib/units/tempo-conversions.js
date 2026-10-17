/**
 * Per-sample beats↔secs converters, resolved against the governing clock: a
 * beat lasts 60/bpm seconds. A port inserts one when a `beats(x)`/`secs(x)`
 * value meets a port of the other unit. `clk` is left unconnected, so compile
 * wires it to the ambient clock's position (in bars; no clock is a loud error)
 * and copies the clock's meter into `config.beatsPerBar`
 * (compile/copy-meter.ts). The tempo is read from the observed per-sample
 * position step, so the time follows the clock. Until the clock advances, a
 * beat is 0.5 s (120 BPM).
 */

/** Seconds per beat for one sample's position `step`; `held` while the clock stands still. */
function secsPerBeat(step, beatsPerBar, sr, held) {
	return step > 0 ? 1 / (step * beatsPerBar * sr) : held
}

defmod(
	"beats2secs",
	{
		cat: "utils",
		doc: "Converts beats to seconds at the clock's tempo. Inserted when beats(x) feeds a seconds port.",
		outs: { out: secs(0.5) },
	},
	({ sr, beatsPerBar = 4 }) => {
		let lastPhase = 0
		let perBeat = 0.5
		return ({ in: inBeats = beats(1), clk = phasePort(0) }) => {
			const step = clk - lastPhase
			lastPhase = clk
			perBeat = secsPerBeat(step, beatsPerBar, sr, perBeat)
			return inBeats * perBeat
		}
	},
)

defmod(
	"secs2beats",
	{
		cat: "utils",
		doc: "Converts seconds to beats at the clock's tempo. Inserted when secs(x) feeds a beats port.",
		outs: { out: beats(1) },
	},
	({ sr, beatsPerBar = 4 }) => {
		let lastPhase = 0
		let perBeat = 0.5
		return ({ in: inSecs = secs(0.5), clk = phasePort(0) }) => {
			const step = clk - lastPhase
			lastPhase = clk
			perBeat = secsPerBeat(step, beatsPerBar, sr, perBeat)
			return inSecs / perBeat
		}
	},
)
