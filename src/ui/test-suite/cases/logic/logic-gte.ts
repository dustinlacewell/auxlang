import type { TestDefinition } from "../types";

export const logicGte: TestDefinition = {
	id: "logic-gte",
	category: "Logic",
	name: "gte - gate drums",
	desc: "Drums start after beat 4",
	code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let drumsOn = gte(cnt.count).b(4)
let s = seq("c1").trig(clk.trig)
return out(mult(kick(s.gate)).b(drumsOn))`,
};
