import type { Example } from "@/ui/editor/examples/example";

/** Pattern records: a field pattern rides alongside the note pattern. */
const patternRecords = `tempo(120)

const s = seq(p\`c3 e3 g3 b3\`.with({ vel: p\`1 0.4 0.7 0.5\` }))
s.tri()
  .lpf({ cutoff: 86, res: 0.2 })
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .mul(s.vel)
  .mul(0.3)
  .out()
`;

export const patternRecordsExample: Example = { name: "pattern records", source: patternRecords };
