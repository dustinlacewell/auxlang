/**
 * The API exposed to user scripts.
 *
 * This module collects all the functions and devices
 * that users can call in their code.
 */

export { device } from "../descriptor/device";

// Oscillators
export { osc, sin, sawOsc, tri, sqr } from "../devices/osc";
export { saw } from "../devices/saw";
export { lfo } from "../devices/lfo";
export { noise } from "../devices/noise";

// Drums
export { kick } from "../devices/drums/kick";
export { snare } from "../devices/drums/snare";
export { hihat } from "../devices/drums/hihat";
export { clap } from "../devices/drums/clap";

// Sequencing
export { clock } from "../devices/clock";
export { seq } from "../devices/seq/seq";
export { counter } from "../devices/counter";
export { clockDiv, clockMult } from "../devices/clock-div";

// Harmony
export { chord } from "../devices/chord";

// Envelopes
export { env } from "../devices/env";
export { adsr } from "../devices/adsr";

// Filters
export { lpf } from "../devices/lpf";
export { hpf } from "../devices/hpf";
export { bpf } from "../devices/bpf";
export { notch } from "../devices/notch";

// Effects
export { delay } from "../devices/delay";
export { reverb } from "../devices/reverb";
export { tape } from "../devices/tape";

// Utilities
export { gain } from "../devices/gain";
export { add } from "../devices/add";
export { mix } from "../devices/mix";
export { slew } from "../devices/slew";
export { sah } from "../devices/sah";
export { pick } from "../devices/pick";
export { quantize } from "../devices/quantize";

// Math & Logic
export {
	mult,
	sub,
	clip,
	scale,
	abs,
	inv,
	div,
	mod,
	gte,
	lt,
	eq,
	and,
	or,
	not,
} from "../devices/math";

// Output
export { out } from "../graph/out";
