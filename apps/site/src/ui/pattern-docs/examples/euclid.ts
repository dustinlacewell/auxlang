import type { DocExample } from "@/ui/docs-kit/doc-example";

export const EUCLID_EXAMPLES: readonly DocExample[] = [
	// -- (euclid) ------------------------------------------------------------
	{
		section: "(euclid)",
		title: "3 in 8",
		description:
			"Euclidean notation spreads 3 hits as evenly as possible across 8 steps — the classic tresillo pulse.",
		code: `tempo(120)
const s = seq("c3(3,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
	{
		section: "(euclid)",
		title: "3 in 8, rotated",
		description:
			"The third argument rotates the euclidean mask — same 3-in-8 density, shifted start, a different groove.",
		code: `tempo(120)
const s = seq("c3(3,8,2)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.3)
  .out()`,
	},
];
