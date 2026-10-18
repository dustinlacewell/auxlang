import type { Example } from "@/ui/editor/examples/example";

/** Widgets that change the patch while it plays. */
const liveControls = `tempo(118)

const s = seq("c3 e3 g3 <b2 a2> c4 g3 e3 <d3 f3>")
const pad = xy(0.5, 0.3, 0, 1)

s.saw()
  .lpf({ cutoff: slider(84, 60, 110), res: knob(0.3, 0, 0.9) })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .delay({ time: 0.3, feedback: pad.y, mix: toggle(1).mul(0.35) })
  .gain(0.3)
  .pan(pad.x.scale(0, 1, -1, 1))
  .out()

button().trig.kick().gain(0.5).out()
`;

export const liveControlsExample: Example = { name: "live controls", source: liveControls };
