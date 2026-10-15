/**
 * Per-sample hz↔semis converters. A port inserts one when a tagged SIGNAL
 * meets it (`lpf({ cutoff: hz(lfo(0.3, 200, 2000)) })`); a tagged constant
 * folds at bind time instead. Frequencies at or below 0.001 Hz clamp to it,
 * so the output stays finite.
 */
defmod({
	name: "hz2semis",
	category: "utils",
	doc: "Converts Hz to semitones (69 = A440). Inserted when hz(signal) feeds a semitone port.",
	ins: { in: hz(440) },
	outs: { out: semis(69) },
	defaultIn: "in",
	defaultOut: "out",
	helpers: { hzToSemis },
	tick: (_s, i, o) => {
		const MIN_HZ = 0.001;
		o.out = hzToSemis(Math.max(i.in, MIN_HZ));
	},
});

defmod({
	name: "semis2hz",
	category: "utils",
	doc: "Converts semitones (69 = A440) to Hz. Inserted when semis(signal) feeds a Hz port.",
	ins: { in: semis(69) },
	outs: { out: hz(440) },
	defaultIn: "in",
	defaultOut: "out",
	helpers: { semisToHz },
	tick: (_s, i, o) => {
		o.out = semisToHz(i.in);
	},
});
