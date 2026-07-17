/**
 * The prefilled demo patch for the playground. Kept as a standalone string so
 * both the page and the headless scratch check (playground-demo.ts) evaluate
 * the EXACT same program text through the same api-in-scope mechanism.
 */

export const DEMO_PATCH = `clock(120)
const s = seq("c3 [e3 g3] <a2 b2> ~")
s.saw()
  .lpf({ cutoff: 1200, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.2))
  .gain(0.25)
  .out()
`;
