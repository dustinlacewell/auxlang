import type { DocExample } from "@/ui/docs-kit/doc-example";

export const SEQUENCE_EXAMPLES: readonly DocExample[] = [
	// -- Sequence ------------------------------------------------------------
	{
		section: "Sequence",
		title: "four notes, one cycle",
		description:
			"A bare space-separated sequence: four notes, evenly dividing the cycle, rising then falling.",
		code: `tempo(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Sequence",
		title: "notes and numbers mix",
		description:
			"Atoms are notes OR bare semitone numbers — here a walking bass in note names, one per cycle-step.",
		code: `tempo(110)
const s = seq("c2 g2 c3 g2 eb2 g2 c3 d3")
s.tri()
  .lpf({ cutoff: 81, res: 0.2 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
];
