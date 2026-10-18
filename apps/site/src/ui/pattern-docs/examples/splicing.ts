import type { DocExample } from "@/ui/docs-kit/doc-example";

export const SPLICING_EXAMPLES: readonly DocExample[] = [
	// -- Splicing ------------------------------------------------------------
	{
		section: "Splicing",
		title: "splice a hook",
		description:
			"Name a hook once, splice it twice — the second an octave up. Patterns are values; ${} drops them into notation.",
		code: `tempo(110)
const hook = p\`c4 e4 g4\`
const s = seq(p\`\${hook} \${hook.add(12)}\`)
s.tri()
  .mul(s.gate.adsr(0.004, 0.07, 0.3, 0.08))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Splicing",
		title: "stack a counter-line",
		description:
			".stack layers patterns simultaneously: the hook against its own reversal an octave up — a two-voice canon from one line.",
		code: `tempo(110)
const hook = p\`c3 e3 g3 e3\`
const s = seq(hook.stack(hook.rev().add(12)))
s.tri()
  .mul(s.gate.adsr(0.004, 0.08, 0.4, 0.1))
  .gain(0.22)
  .out()`,
	},
];
