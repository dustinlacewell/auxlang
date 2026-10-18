import type { Example } from "@/ui/editor/examples/example";

/** (c) Pattern-as-signal: a pattern patched straight into a filter cutoff. */
const patternAsSignal = `tempo(120)

const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`62 86 [98 74] <67 93>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.4 })
  .mul(s.gate.adsr(0.005, 0.15, 0.3, 0.1))
  .mul(0.3)
  .out()
`;

export const patternAsSignalExample: Example = {
	name: "pattern as signal",
	source: patternAsSignal,
};
