import type { DocExample } from "@/ui/docs-kit/doc-example";

export const CHORD_VOCABULARY_EXAMPLES: readonly DocExample[] = [
	// -- Chord vocabulary -------------------------------------------------------
	{
		section: "Chord vocabulary",
		title: "chord(name).voicing()",
		description:
			"chord(\"Cm9\").voicing() realizes the named quality to its absolute tones and stacks them — a five-note chord from one word.",
		code: `tempo(90)
const s = seq(chord("Cm9").voicing())
s.tri()
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "offset and mode — octave and register",
		description:
			".offset(-1) drops the voicing an octave; .mode(\"root:g2\") sets which octave the root sits in before that shift.",
		code: `tempo(90)
const s = seq(chord("Fm9").mode("root:g2").offset(-1).voicing())
s.tri()
  .lpf({ cutoff: 84, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "anchor — invert toward a note",
		description:
			".anchor(\"D5\") inverts the voicing so its top tone sits at or below D5, instead of always starting from the root's octave.",
		code: `tempo(90)
const s = seq(chord("Bbm9").anchor("D5").voicing())
s.tri()
  .lpf({ cutoff: 88, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "Chord vocabulary",
		title: "n / set — index chord tones by pattern",
		description:
			"chord(\"Bbm9\").n(idx) plays one tone per step of idx (0 = lowest) instead of the whole stack — an arpeggio through the chord's own tones.",
		code: `tempo(130)
const s = seq(chord("Bbm9").n(p\`0 1 2 4\`))
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
];
