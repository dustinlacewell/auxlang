import type { DocExample } from "@/ui/docs-kit/doc-example";

export const TIES_EXAMPLES: readonly DocExample[] = [
	// -- Ties ----------------------------------------------------------------
	{
		section: "Ties",
		title: "legato across steps",
		description:
			"An underscore ties a note into the next slot: the gate stays high, so c3 sustains legato through beat 2 instead of retriggering.",
		code: `tempo(110)
const s = seq("c3 _ e3 g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.8, 0.2))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Ties",
		title: "tie twice, hold three beats",
		description:
			"Each underscore extends the note one more slot: c3 holds for three of four beats, then a pickup. Ties never retrigger.",
		code: `tempo(110)
const s = seq("c3 _ _ g3")
s.tri()
  .mul(s.gate.adsr(0.01, 0.15, 0.8, 0.2))
  .gain(0.3)
  .out()`,
	},
];
