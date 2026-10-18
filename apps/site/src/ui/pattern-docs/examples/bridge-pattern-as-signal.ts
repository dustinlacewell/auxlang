import type { DocExample } from "@/ui/docs-kit/doc-example";

export const BRIDGE_PATTERN_AS_SIGNAL_EXAMPLES: readonly DocExample[] = [
	// -- Bridge: pattern as signal ------------------------------------------
	{
		section: "Bridge: pattern as signal",
		title: "pattern-modulated pitch",
		description:
			"A p`...` handed to any port lifts to a stepped, sample-and-held signal. On the pitch port it IS the melody — no seq, no gates, a drone that walks.",
		code: `tempo(100)
tri({ pitch: p\`48 55 60 63\` })
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(lfo(0.5, 0.2, 0.5))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge: pattern as signal",
		title: "pattern-modulated cutoff",
		description:
			"Steps click into a continuous knob like cutoff — slew glides them. The pattern subdivides and alternates like any other.",
		code: `tempo(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`67 79 [91 62] <55 103>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.5 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.25)
  .out()`,
	},
];
