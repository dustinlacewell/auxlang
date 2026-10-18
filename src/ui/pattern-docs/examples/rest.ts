import type { DocExample } from "@/ui/docs-kit/doc-example";

export const REST_EXAMPLES: readonly DocExample[] = [
	// -- Rest ----------------------------------------------------------------
	{
		section: "Rest",
		title: "~ is a rest step",
		description:
			"A tilde is a rest: a step with its gate low, so you hear notes on beats 1 and 3 with holes on 2 and 4.",
		code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Rest",
		title: "rests make the groove",
		description: "Rests inside groups push notes off the beat — the holes are the groove.",
		code: `tempo(120)
const s = seq("c3 [~ e3] ~ [~ g3]")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
];
