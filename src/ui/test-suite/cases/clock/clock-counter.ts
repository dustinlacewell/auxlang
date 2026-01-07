import type { TestDefinition } from "../types";

export const clockCounter: TestDefinition = {
	id: "clock-counter",
	category: "Clock",
	name: "counter",
	desc: "Count beats, modulo 4 - pitch changes each beat",
	code: `let clk = clock(120)
let s = seq("c4").trig(clk.trig)
let cnt = counter(clk.trig).max(4)
let pitch = add(s.cv).b(mult(cnt.count).b(50))
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(pitch)).cutoff(1500)).b(e.out))`,
};
