import type { DocExample } from "@/ui/docs-kit/doc-example";

export const FAST_EXAMPLES: readonly DocExample[] = [
	// -- *fast ---------------------------------------------------------------
	{
		section: "*fast",
		title: "repeat within a step",
		description:
			"The star repeats a step in place: beat 2 fires four times inside its slot, a fast rattle against slow neighbours.",
		code: `tempo(120)
const s = seq("c3 e3*4 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "*fast",
		title: "star a group",
		description:
			"The star takes any element: a bracketed pair repeated twice inside one step — four fast notes, then a plain one.",
		code: `tempo(115)
const s = seq("[c3 g3]*2 e3")
s.tri()
  .mul(s.gate.adsr(0.003, 0.05, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "*fast",
		title: "/slow stretches a group in place",
		description:
			"Slash is star's mirror: a bracketed group spread across two steps' worth of time instead of packed into one — beat 2 drags, the rest stay put.",
		code: `tempo(130)
const s = seq("c3 [e3 g3]/2 c3 e3")
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
];
