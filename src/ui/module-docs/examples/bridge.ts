import type { DocExample } from "@/ui/docs-kit/doc-example";

export const BRIDGE_EXAMPLES: readonly DocExample[] = [
	// ======================================================================
	// Bridge — patterns on knobs, counter
	// ======================================================================
	{
		section: "Bridge",
		title: "seq — a pattern on a knob",
		description:
			"A pattern fed straight into a knob becomes a seq: read at the ambient clock's position, sample-and-held. Four pitches step the oscillator, one per beat.",
		code: `tempo(150)
sin()
  .pitch(p\`48 55 60 63\`)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "seq — stepped cutoff (showcase)",
		description:
			"The same lifting works on any port: a pattern clicks the cutoff between four values each bar. slew it to glide.",
		code: `tempo(150)
saw(45)
  .lpf(p\`67 91 79 98\`, 0.3)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — default",
		description:
			"counter counts trigs into a step position. A seq reading a .steps() pattern moves one step per beat — an analog step sequencer.",
		code: `const c = tempo(150)
sin()
  .pitch(counter(c.beat).seq(p\`48 55 60 67\`.steps()))
  .mul(c.beat.ad(0.005, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — all params",
		description:
			"length 3 wraps the count, and the bar trig resets it — each four-beat bar plays 48 55 60 48, then starts again.",
		code: `const c = tempo(150)
sin()
  .pitch(counter(c.beat, { reset: c.bar, length: 3 }).seq(p\`48 55 60 67\`.steps()))
  .mul(c.beat.ad(0.005, 0.15))
  .gain(0.35)
  .out()`,
	},
	{
		section: "Bridge",
		title: "counter — accents (showcase)",
		description:
			"Timing from one pattern, dynamics from another: a euclidean line whose accent levels step forward on each onset.",
		code: `tempo(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(counter(s.trig).seq(p\`0.3 0.1 0.25 0.15\`.steps()))
  .gain(0.9)
  .out()`,
	},
];
