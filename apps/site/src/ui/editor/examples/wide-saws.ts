import type { Example } from "@/ui/editor/examples/example";

/** Detuned saws spread across the stereo field. */
const wideSaws = `tempo(90)

const s = seq("c3 <g2 a2> f2 <g2 e2>")
s.add(p\`[-0.12, 0, 0.12]\`)
  .saw()
  .lpf({ cutoff: 84, res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.2, 0.6, 0.3))
  .mul(0.3)
  .spread()
  .out()
`;

export const wideSawsExample: Example = { name: "detuned saws", source: wideSaws };
