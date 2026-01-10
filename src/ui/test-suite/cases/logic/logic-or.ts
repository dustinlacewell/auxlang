import type { TestDefinition } from "../types";

export const logicOr: TestDefinition = {
	id: "logic-or",
	category: "Logic",
	name: "or - logical OR",
	desc: "Hihat plays on beat 1 OR beat 3 (first or third quarter)",
	code: `let clk = clock(120)
let mod4 = counter(clk.trig).count.mod({ by: 4 })
let playHat = mod4.eq({ to: 0 }).or({ with: mod4.eq({ to: 2 }) })
let e = clk.trig.env({ attack: 0.001, release: 0.1 }).mult({ by: playHat })
noise().hpf({ cutoff: 8000 }).mult({ by: e }).out()`,
};
