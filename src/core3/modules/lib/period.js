/**
 * period(pitch) — seconds per cycle of a pitch in semitones, for tuned delays:
 * `delay({ time: period(48), feedback: 0.95 })` rings at C3.
 */
defmod(
	"period",
	{
		cat: "utils",
		doc: "Seconds per cycle of a pitch (semitones) — tunes a delay to a note.",
		args: ["pitch"],
		outs: { out: secs(1 / 440) },
	},
	() => {
		return ({ pitch = semis(69) }) => {
			return 1 / semisToHz(pitch)
		}
	},
)
