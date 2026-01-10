import type { TestDefinition } from "../types";

export const utilSah: TestDefinition = {
	id: "util-sah",
	category: "Utilities",
	name: "sah - sample and hold",
	desc: "Random pitch each beat - LFO sampled on trigger",
	code: `clock(150)
  .apply(c =>
    noise()
      .min(200)
      .max(800)
      .sah({ trig: c.trig })
      .osc()
      .gain({
        level: c.gate.env({
          attack: 0.01,
          release: 0.15
        })
      })
      .out()
  )`,
};
