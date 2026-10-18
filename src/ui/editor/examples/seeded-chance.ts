import type { Example } from "@/ui/editor/examples/example";

/** (f2) Seeds: pin the patch seed; hold one part with a local seed. */
const seededChance = `tempo(120)
seed(7)

const hook = seq(p\`c4 e4 g4 b4\`.fast(2).degrade(0.4))
hook.tri()
  .mul(hook.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .gain(0.3)
  .out()

const ghost = seq(p\`c5*8\`.degrade(0.6).seed(3))
ghost.sin()
  .mul(ghost.gate.ad(0.002, 0.05))
  .gain(0.15)
  .out()
`;

export const seededChanceExample: Example = { name: "seeded chance", source: seededChance };
