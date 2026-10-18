import type { Example } from "@/ui/editor/examples/example";

/** (a) First sound: tempo + seq + saw → filter → envelope. */
const firstSound = `tempo(120)

const s = seq("c3 e3 g3 <b2 a2>")
s.saw()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .mul(0.35)
  .out()
`;

export const firstSoundExample: Example = { name: "first sound", source: firstSound };
