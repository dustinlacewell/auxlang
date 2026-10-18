import type { DocExample } from "@/ui/docs-kit/doc-example";

export const HOLD_EXAMPLES: readonly DocExample[] = [
	// -- @hold ---------------------------------------------------------------
	{
		section: "@hold",
		title: "weighted duration",
		description:
			"The at-sign gives a step extra weight — c3@3 occupies three-quarters of the cycle, then g3 gets the last quarter.",
		code: `tempo(110)
const s = seq("c3@3 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.7, 0.2))
  .gain(0.3)
  .out()`,
	},
	{
		section: "@hold",
		title: "a long note mid-line",
		description:
			"Weights work anywhere: e3@2 takes two slots of four — the line breathes long in the middle.",
		code: `tempo(110)
const s = seq("c3 e3@2 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.7, 0.2))
  .gain(0.3)
  .out()`,
	},
];
