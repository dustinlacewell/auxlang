import type { Example } from "@/ui/editor/examples/example";

/** (d) loop() feedback: a Karplus-Strong pluck from a noise burst. */
const karplus = `tempo(96)

const s = seq("c3 g3 <c4 e4> g3")
const exciter = noise().mul(s.gate.ad(0.001, 0.008))

loop((fb) =>
  exciter.add(
    fb.delay({ time: 0.006, feedback: 0, mix: 1 }).lpf({ cutoff: 98 }).mul(0.99),
  ),
).mul(0.8).out()
`;

export const karplusExample: Example = { name: "karplus pluck (loop)", source: karplus };
