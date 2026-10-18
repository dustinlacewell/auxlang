import type { DocExample } from "@/ui/docs-kit/doc-example";

export const ALTERNATION_EXAMPLES: readonly DocExample[] = [
	// -- < Alternation > -----------------------------------------------------
	{
		section: "< Alternation >",
		title: "one per cycle",
		description:
			"Angle brackets pick ONE child per cycle in turn: the last step is a2 on cycle 1, b2 on cycle 2, then repeats.",
		code: `tempo(120)
const s = seq("c3 e3 g3 <a2 b2>")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,
	},
	{
		section: "< Alternation >",
		title: "nested — a four-cycle progression",
		description:
			"Alternations nest: f2/g2 alternate inside the outer alternation — c f c g, a four-cycle progression from seven characters.",
		code: `tempo(120)
const s = seq("<c2 <f2 g2>>")
s.tri()
  .lpf({ cutoff: 81, res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.2, 0.7, 0.3))
  .gain(0.3)
  .out()`,
	},
];
