import type { Example } from "@/ui/editor/examples/example";

/** A pattern that switches a filter cutoff between live signals. */
const signalSplice = `tempo(110)

const s = seq("c2 c2 c2 c2")
const wobble = lfo(0.3, 60, 96)
s.saw()
  .lpf({ cutoff: p\`\${wobble} 80\` })
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.1))
  .mul(0.3)
  .out()
`;

export const signalSpliceExample: Example = { name: "signal switching", source: signalSplice };
