import { defmod } from "../patch/defmod";
import { semisToHz } from "../units/pitch";
import { secs, semis } from "../units/tag";

/**
 * period(pitch) — seconds per cycle of a pitch in semitones, for tuned delays:
 * `delay({ time: period(48), feedback: 0.95 })` rings at C3.
 */
defmod({
	name: "period",
	category: "utils",
	doc: "Seconds per cycle of a pitch (semitones) — tunes a delay to a note.",
	ins: { pitch: semis(69) },
	outs: { out: secs(1 / 440) },
	defaultIn: "pitch",
	defaultOut: "out",
	positional: ["pitch"],
	tick: (_s, i, o) => {
		o.out = 1 / semisToHz(i.pitch);
	},
});
