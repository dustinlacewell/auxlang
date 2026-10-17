/**
 * Per-sample hz↔semis converters. A port inserts one when a tagged SIGNAL
 * meets it (`lpf({ cutoff: hz(lfo(0.3, 200, 2000)) })`); a tagged constant
 * folds at bind time instead. Frequencies at or below 0.001 Hz clamp to it,
 * so the output stays finite.
 */
defmod(
	"hz2semis",
	{
		cat: "utils",
		doc: "Converts Hz to semitones (69 = A440). Inserted when hz(signal) feeds a semitone port.",
		outs: { out: semis(69) },
	},
	() => {
		return ({ in: inHz = hz(440) }) => {
			const MIN_HZ = 0.001
			return hzToSemis(Math.max(inHz, MIN_HZ))
		}
	},
)

defmod(
	"semis2hz",
	{
		cat: "utils",
		doc: "Converts semitones (69 = A440) to Hz. Inserted when semis(signal) feeds a Hz port.",
		outs: { out: hz(440) },
	},
	() => {
		return ({ in: inSemis = semis(69) }) => {
			return semisToHz(inSemis)
		}
	},
)
