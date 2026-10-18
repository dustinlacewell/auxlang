import type { DocExample } from "@/ui/docs-kit/doc-example";

export const CHORDS_EXAMPLES: readonly DocExample[] = [
	// -- [ Chords, ] ---------------------------------------------------------
	{
		section: "[ Chords, ]",
		title: "a chord",
		description:
			"Commas inside brackets sound together — a three-voice C-major chord, packed into three poly lanes.",
		code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: "alternating chords",
		description:
			"Each bracketed step is a chord; alternation inside swaps the harmony every cycle — I chord, then IV.",
		code: `tempo(90)
const s = seq("[c3,e3,g3] <[f3,a3,c4] [g3,b3,d4]>")
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: "voices: stable",
		description:
			'.voices("stable") keeps a common tone in its lane across a chord change — C3 stays in one voice into the second chord, G2 into the fourth.',
		code: `tempo(90)
const s = seq(p\`<[c3,e3,g3] [a2,c3,f3] [g2,b2,d3] [g2,c3,e3]>\`.voices("stable"))
s.tri()
  .lpf({ cutoff: 89, res: 0.2 })
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.22)
  .out()`,
	},
	{
		section: "[ Chords, ]",
		title: 'voices: round-robin',
		description:
			'.voices("rr", 4) sends each note onset to the NEXT of 4 lanes in turn, so a lane\'s release keeps ringing under later notes instead of being cut off.',
		code: `tempo(130)
const s = seq(p\`c3 e3 g3 b3\`.voices("rr", 4))
s.tri()
  .mul(s.gate.ar(0.005, 0.5))
  .gain(0.18)
  .out()`,
	},
];
