import type { Example } from "@/ui/editor/examples/example";

/** A delay time in beats, so the echo stays in tempo. */
const syncedEcho = `tempo(100)

const s = seq("c3 ~ g3 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.15))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: beats(0.75), mix: 1 }).mul(0.5))))
  .gain(0.3)
  .out()
`;

export const syncedEchoExample: Example = { name: "synced echo", source: syncedEcho };
