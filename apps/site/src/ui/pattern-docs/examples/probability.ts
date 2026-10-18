import type { DocExample } from "@/ui/docs-kit/doc-example";

export const PROBABILITY_EXAMPLES: readonly DocExample[] = [
	// -- ?probability --------------------------------------------------------
	{
		section: "?probability",
		title: "maybe (50%)",
		description:
			"A question mark turns the note into a rest with 50% probability, seeded — the pattern thins out, but the same every run.",
		code: `tempo(120)
const s = seq("c3? e3? g3? b3?")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "?probability",
		title: "maybe (rest 25%)",
		description:
			"A probability suffix sets the rest chance: c3?0.25 sounds in most cycles, the run stays denser than plain ?.",
		code: `tempo(120)
const s = seq("c3?0.25 e3?0.25 g3?0.25 b3?0.25")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
];
