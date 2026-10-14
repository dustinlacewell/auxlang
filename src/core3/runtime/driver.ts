/**
 * A driver computes one sample of node work: it walks every node in program
 * order, gathering inputs from `cur` ("n" sources) / `prv` ("z" sources),
 * ticking, and scattering outputs into `cur`. The engine owns the buffers,
 * the flip, the out-node sum, and the sample count.
 */

export type Driver = (cur: Float64Array, prv: Float64Array, sr: number, time: number) => void;
