/**
 * API exports for user code.
 *
 * This module is passed to runCode() so user code has access to devices.
 */

// Oscillators
export { osc, sin, saw, tri, sqr } from "./devices/osc";
export { noise } from "./devices/noise";

// Filters
export { lpf } from "./devices/lpf";
export { hpf } from "./devices/hpf";
export { bpf } from "./devices/bpf";
export { notch } from "./devices/notch";

// Effects
export { delay } from "./devices/delay";
export { reverb } from "./devices/reverb";
export { nativeReverb } from "./devices/native-reverb";
export { tape } from "./devices/tape";

// Envelopes
export { ad } from "./devices/ad";
export { adsr } from "./devices/adsr";
export { ar } from "./devices/ar";

// Math
export { mult, sub, clip, abs, inv, div, mod, gte, lt, eq, and, or, not } from "./devices/math";
export { scale } from "./devices/scale";
export { add } from "./devices/add";

// Utils
export { gain } from "./devices/gain";
export { vca } from "./devices/vca";
export { mix } from "./devices/mix";
export { slew } from "./devices/slew";
export { sah } from "./devices/sah";
export { alt } from "./devices/alt";
export { pick } from "./devices/pick";
export { quantize } from "./devices/quantize";
export { $ } from "./note";

// Timing
export { clock } from "./devices/clock";
export { clockDiv, clockMult } from "./devices/clock-div";
export { swing } from "./devices/swing";
export { counter } from "./devices/counter";
export { seq } from "./devices/seq/seq";

// Drums
export { kick } from "./devices/drums/kick";
export { snare } from "./devices/drums/snare";
export { hihat } from "./devices/drums/hihat";
export { clap } from "./devices/drums/clap";

// Poly
export { chord } from "./devices/chord";
export { poly } from "./devices/poly";
export { sum } from "./devices/sum";

// Stereo
export { pan } from "./devices/pan";
export { spread } from "./devices/spread";

// Output
export { out } from "./graph/out";
