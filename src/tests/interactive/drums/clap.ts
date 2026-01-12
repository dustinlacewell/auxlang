/**
 * clap - 808/909-style hand clap synthesizer
 *
 * Inputs:
 *   trig: signal (default: 0) - trigger impulse
 *   decay: number (default: 0.2) - tail decay time
 *   tone: number (default: 0.5) - filter brightness 0-1
 *
 * Outputs:
 *   audio: synthesized hand clap
 */

import type { TestDefinition } from "../types";

export const clapDefault: TestDefinition = {
	id: "clap-default",
	category: "Drums",
	name: "clap - defaults",
	desc: "Basic clap on beat 2",
	code: `clock(120).seq("~ c4 ~ ~").trig.clap().out()`,
};

export const clapAllParams: TestDefinition = {
	id: "clap-all-params",
	category: "Drums",
	name: "clap - all params",
	desc: "Bright clap with long decay",
	code: `clock(120).seq("~ c4 ~ ~").trig.clap({ decay: 0.3, tone: 0.7 }).out()`,
};

export const clapModDecay: TestDefinition = {
	id: "clap-mod-decay",
	category: "Drums",
	name: "clap - modulated decay",
	desc: "Clap with varying tail length",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.clap({ decay: lfo(0.25, 0.1, 0.4) }).out()
)`,
};

export const clapModTone: TestDefinition = {
	id: "clap-mod-tone",
	category: "Drums",
	name: "clap - modulated tone",
	desc: "Clap brightness sweep",
	code: `clock(120).seq("~ c4 ~ c4").apply(s =>
  s.trig.clap({ tone: lfo(0.5, 0.2, 0.8) }).out()
)`,
};

export const clapShowcase: TestDefinition = {
	id: "clap-showcase",
	category: "Drums",
	name: "clap - showcase",
	desc: "Backbeat clap pattern",
	code: `clock(120).seq("~ c4 ~ c4").trig.clap({ decay: 0.2, tone: 0.5 }).out()`,
};

export const clapTests = [clapDefault, clapAllParams, clapModDecay, clapModTone, clapShowcase];
