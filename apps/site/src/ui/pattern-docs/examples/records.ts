import type { DocExample } from "@/ui/docs-kit/doc-example";

export const RECORDS_EXAMPLES: readonly DocExample[] = [
	// -- Records --------------------------------------------------------------
	{
		section: "Records",
		title: "a per-note velocity field",
		description:
			".with({ vel }) adds one output per field, sampled at each onset and held between notes — here it drives gain note by note.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.4 0.7 0.5\` }))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .mul(s.vel)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Records",
		title: "two fields at once",
		description:
			"A record can carry several fields — vel drives gain, cv2 bends the filter, both read from the same seq.",
		code: `tempo(110)
const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.5 0.8 0.4\`, cv2: p\`0 0.3 0.6 0.2\` }))
s.saw()
  .lpf({ cutoff: 79 })
  .mod("cutoff", s.cv2, 24)
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .mul(s.vel)
  .gain(0.3)
  .out()`,
	},
];
