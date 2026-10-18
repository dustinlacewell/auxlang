import type { Example } from "@/ui/editor/examples/example";

/** (b) Patterns are values: build a hook, transform it before sequencing. */
const patternsAsValues = `tempo(120)

const hook = p\`c3 [e3 g3] a3 ~\`
const line = seq(hook.rev().every(2, (q) => q.add(7)).off(1 / 8, (q) => q.add(12)))

line.tri()
  .lpf({ cutoff: 91, res: 0.2 })
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(0.3)
  .out()
`;

export const patternsAsValuesExample: Example = {
	name: "patterns as values",
	source: patternsAsValues,
};
