import type { DocExample } from "@/ui/docs-kit/doc-example";

export const POLYMETER_EXAMPLES: readonly DocExample[] = [
	// -- { Polymeter } -------------------------------------------------------
	{
		section: "{ Polymeter }",
		title: "three against two",
		description:
			"Layers play at the first layer's step rate: the two-note layer runs three steps per cycle, so it starts on a different note each cycle.",
		code: `tempo(100)
const s = seq("{c3 e3 g3, c4 d4}")
s.tri()
  .mul(s.gate.adsr(0.004, 0.1, 0.4, 0.1))
  .gain(0.22)
  .out()`,
	},
];
