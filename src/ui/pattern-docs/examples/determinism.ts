import type { DocExample } from "@/ui/docs-kit/doc-example";

export const DETERMINISM_EXAMPLES: readonly DocExample[] = [
	// -- Determinism ----------------------------------------------------------
	{
		section: "Determinism",
		title: "seed(n) pins the patch",
		description:
			"seed(42) fixes every random choice in the patch — the degrade pattern thins out the same way on every run instead of drawing a fresh seed at play start.",
		code: `seed(42)
tempo(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4))
s.saw()
  .lpf({ cutoff: 91, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Determinism",
		title: "p.seed(n) pins one pattern",
		description:
			"p\`...\`.seed(n) gives ONE pattern its own seed, so it keeps its randomness even if the patch seed above it changes — the degrade here stays fixed at 9 regardless.",
		code: `tempo(120)
const s = seq(p\`c3 e3 g3 b3 c4 b3 g3 e3\`.degrade(0.4).seed(9))
s.saw()
  .lpf({ cutoff: 91, res: 0.3 })
  .mul(s.gate.adsr(0.003, 0.06, 0.2, 0.05))
  .gain(0.25)
  .out()`,
	},
];
