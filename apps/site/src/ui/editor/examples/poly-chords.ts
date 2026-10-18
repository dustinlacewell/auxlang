import type { Example } from "@/ui/editor/examples/example";

/** A chord pattern that plays every voice at once. */
const polyChords = `tempo(90)

const pad = seq("[c3,e3,g3] <[a2,c3,e3] [f2,a2,c3]>")
const amp = pad.gate.adsr(0.05, 0.1, 1, 0.3).slew(0.015, 0.015)
pad.tri()
  .lpf({ cutoff: p\`74 <81 89>\`, res: 0.2 })
  .mul(amp)
  .mul(0.3)
  .spread()
  .out()
`;

export const polyChordsExample: Example = { name: "chords", source: polyChords };
