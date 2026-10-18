import type { DocExample } from "@/ui/docs-kit/doc-example";

export const BRIDGE_TRIGGER_DOMAIN_EXAMPLES: readonly DocExample[] = [
	// -- Bridge: trigger domain ---------------------------------------------
	{
		section: "Bridge: trigger domain",
		title: "step by trigger",
		description:
			"counter turns each TRIGGER into one step of position, and .steps() makes each event one step, so seq reads the next value per hit, ignoring durations — driven by the seq's trig, the accent walks 0.3, 0.1, 0.25, 0.15.",
		code: `tempo(110)
const s = seq("c2(4,8)")
const amp = counter(s.trig).seq(p\`0.3 0.1 0.25 0.15\`.steps())
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(amp)
  .gain(0.9)
  .out()`,
	},
	{
		section: "Bridge: trigger domain",
		title: "stepped by an LFO comparator",
		description:
			"Any trigger works: an LFO through .gt(0.7) fires a steady pulse, and the counter walks the value list on each — no clock involved.",
		code: `const trg = lfo(6).gt(0.7)
tri(counter(trg).seq(p\`48 52 55 60\`.steps()))
  .mul(trg.ar(0.002, 0.12))
  .gain(0.3)
  .out()`,
	},
];
