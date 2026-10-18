import type { DocExample } from "@/ui/docs-kit/doc-example";

export const SLIDES_EXAMPLES: readonly DocExample[] = [
	// -- Slides --------------------------------------------------------------
	{
		section: "Slides",
		title: "slide into the next note",
		description:
			"An underscore between two notes slides: e3 and g3 arrive with no new attack, and .slide opens a glide only there. Three attacks per bar.",
		code: `tempo(110)
const s = seq("c3_e3 g3_c4 a2 e3")
const glide = s.slide.mul(0.04)
s.slew(glide, glide)
  .saw()
  .lpf(84, 0.3)
  .mul(s.gate.adsr(0.005, 0.2, 0.6, 0.1))
  .gain(0.25)
  .out()`,
	},
];
