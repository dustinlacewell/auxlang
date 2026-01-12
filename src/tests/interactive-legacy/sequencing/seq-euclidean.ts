import type { TestDefinition } from "../types";

export const seqEuclidean: TestDefinition = {
	id: "seq-euclidean",
	category: "Sequencer",
	name: "seq - euclidean (k,n)",
	desc: "c4(3,8) = 3 hits spread over 8 steps",
	code: `clock(140)
  .seq("c4(3,8)")
  .apply(s =>
    s.saw()
      .lpf({ cutoff: 2000 })
      .gain({
        level: s.gate.adsr({
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.1
        })
      })
      .out()
  )`,
};
