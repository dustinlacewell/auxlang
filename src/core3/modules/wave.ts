/**
 * Shared waveform sampler for the osc family and lfo.
 *
 * Band-limiting: saw and sqr use a 2-sample polyBLEP correction at each phase
 * discontinuity. tri is generated DIRECTLY from phase (exact unit amplitude,
 * zero DC, no warmup transient); a triangle's harmonics roll off 12 dB/oct so
 * naive generation aliases negligibly. (An integrated-square triangle was tried
 * and rejected: folding polyBLEP into the integrand injects amplitude overshoot,
 * and the DC-blocker needed to centre a raw integrator overshoots on startup.)
 * sin is naive (no discontinuity to band-limit).
 */

export type Shape = "sin" | "saw" | "tri" | "sqr";

/** 2-sample polyBLEP residual around a phase discontinuity at t=0/1. */
function polyBLEP(t: number, dt: number): number {
	if (t < dt) {
		const x = t / dt;
		return x + x - x * x - 1;
	}
	if (t > 1 - dt) {
		const x = (t - 1) / dt;
		return x * x + x + x + 1;
	}
	return 0;
}

export function sample(shape: Shape, phase: number, dt: number): number {
	if (shape === "sin") return Math.sin(phase * Math.PI * 2);
	if (shape === "saw") return 2 * phase - 1 - polyBLEP(phase, dt);
	if (shape === "sqr") {
		let sq = phase < 0.5 ? 1 : -1;
		sq += polyBLEP(phase, dt);
		sq -= polyBLEP((phase + 0.5) % 1, dt);
		return sq;
	}
	// tri: direct from phase — rises 0→0.5 as -1→+1, falls 0.5→1 as +1→-1.
	return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
}
