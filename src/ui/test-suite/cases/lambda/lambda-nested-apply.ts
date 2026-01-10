import type { TestDefinition } from "../types";

export const lambdaNestedApply: TestDefinition = {
	id: "lambda-multi-seq",
	category: "Apply",
	name: "multiple sequences",
	desc: "Two sequences sharing a clock, mixed together",
	code: `// Two sequences sharing the same clock
let c = clock(90)
let bass = seq("c3 ~ g3 ~", { clk: c })
let lead = seq("c5 e5 g5 e5", { clk: c })

// Mix bass and lead
let bassVoice = bass.saw().lpf({ cutoff: 400 }).gain({ level: bass.gate.adsr({ attack: 0.01, sustain: 0.6, release: 0.2 }) })
let leadVoice = lead.saw().lpf({ cutoff: 2000 }).gain({ level: lead.gate.adsr({ attack: 0.05, sustain: 0.4, release: 0.3 }) }).mult({ by: 0.5 })
mix({ a: bassVoice, b: leadVoice }).gain({ level: 0.3 }).out()`,
};
