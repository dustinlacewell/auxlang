import type { DocExample } from "@/ui/docs-kit/doc-example";

export const GROUPING_EXAMPLES: readonly DocExample[] = [
	// -- [ Grouping ] --------------------------------------------------------
	{
		section: "[ Grouping ]",
		title: "subdivide one step",
		description:
			"Brackets pack a group into ONE step: beat 2 splits into two fast notes, the rest stay slow.",
		code: `tempo(120)
const s = seq("c3 [e3 g3] c3 [g3 e3]")
s.tri()
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,
	},
	{
		section: "[ Grouping ]",
		title: "nested subdivision",
		description:
			"Groups nest: the last step is a group whose second half is itself a group — a little triplet-into-run gesture.",
		code: `tempo(115)
const s = seq("c3 e3 [g3 [b3 c4]]")
s.tri()
  .mul(s.gate.adsr(0.004, 0.07, 0.3, 0.08))
  .gain(0.3)
  .out()`,
	},
];
