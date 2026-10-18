import type { DocExample } from "@/ui/docs-kit/doc-example";

export const REPLICATE_EXAMPLES: readonly DocExample[] = [
	// -- !replicate ----------------------------------------------------------
	{
		section: "!replicate",
		title: "replicate adds steps",
		description:
			"Bang replicates a note into that many SEPARATE steps — c3!3 makes three equal steps, so the cycle is longer, not faster.",
		code: `tempo(120)
const s = seq("c3!3 g3")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "!replicate",
		title: "star vs bang",
		description:
			"The classic confusion, A/B'd by alternation: cycle one is c3*2 g3 (c3 doubled inside its step — a gallop), cycle two is c3!2 g3 (three equal steps). Same characters, different time.",
		code: `tempo(110)
const s = seq("<[c3*2 g3] [c3!2 g3]>")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
];
