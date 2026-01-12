import type { TestDefinition } from "../types";

export const envAdsrFull: TestDefinition = {
	id: "env-adsr-full",
	category: "Envelopes",
	name: "adsr - all parameters",
	desc: "Long attack, short decay, mid sustain, long release - pad sound",
	code: `clock(40)
  .seq("c3 e3")
  .apply(s =>
    s.saw()
      .lpf({
        cutoff: 800,
        resonance: 0.2
      })
      .gain({
        level: s.gate.adsr({
          attack: 0.5,
          decay: 0.3,
          sustain: 0.6,
          release: 1.5
        })
      })
      .out()
  )`,
};
