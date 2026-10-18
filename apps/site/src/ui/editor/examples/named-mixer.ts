import type { Example } from "@/ui/editor/examples/example";

/** Named channels mixed at their own levels. */
const namedMixer = `tempo(110)

const lead = seq("c4 e4 g4 b4")
const bass = seq("c3 ~ g2 ~")
const drums = seq("60*4")

const leadVoice = lead.tri().mul(lead.gate.adsr(0.005, 0.1, 0.4, 0.1))
const bassVoice = bass.tri().mul(bass.gate.adsr(0.01, 0.2, 0.7, 0.2))
const kickVoice = drums.trig.kick()

mixer({ lead: leadVoice, bass: bassVoice, drums: kickVoice })
  .level({ lead: 0.3, bass: 0.5, drums: 0.8 })
  .mod("level.lead", lfo(0.2), 0.15)
  .out()
`;

export const namedMixerExample: Example = { name: "named mixer", source: namedMixer };
