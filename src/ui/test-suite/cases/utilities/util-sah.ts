import type { TestDefinition } from "../types";

export const utilSah: TestDefinition = {
	id: "util-sah",
	category: "Utilities",
	name: "sah - sample and hold",
	desc: "Random pitch each beat - LFO sampled on trigger",
	code: `let clk = clock(150)
let freq = noise().min(200).max(800).sah({ trig: clk.trig })
freq
  .osc()
  .gain({ level: clk.gate.env({ attack: 0.01, release: 0.15 }) })
  .out()`,
};
