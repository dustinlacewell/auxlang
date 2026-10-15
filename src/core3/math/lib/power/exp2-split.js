/**
 * 2^(ph + pl) for a double-double exponent in about [-1075, 1024] (the tail
 * of fdlibm e_pow): take out the nearest integer n, compute 2^r as e^(r*ln2)
 * with r*ln2 in split precision, then scale by 2^n. The caller handles
 * overflow and underflow.
 */
function exp2Split(ph, pl) {
	const lg2 = 6.93147180559945286227e-1;
	const lg2H = 6.93147182464599609375e-1;
	const lg2L = -1.90465429995776804525e-9;
	const P1 = 1.66666666666666019037e-1;
	const P2 = -2.77777777770155933842e-3;
	const P3 = 6.61375632143793436117e-5;
	const P4 = -1.6533902205465251539e-6;
	const P5 = 4.13813679705723846039e-8;
	let pH = ph;
	const z0 = pl + pH;
	let n = 0;
	if (Math.abs(z0) >= 0.5000004768371582) {
		// fdlibm rounds half away from zero here.
		const whole = Math.trunc(Math.abs(z0) + 0.5);
		n = z0 < 0 ? -whole : whole;
		pH -= n;
	}
	const t = highBits21(pl + pH);
	const u = t * lg2H;
	const v = (pl - (t - pH)) * lg2 + t * lg2L;
	const z = u + v;
	const w = v - (z - u);
	const tt = z * z;
	const t1 = z - tt * (P1 + tt * (P2 + tt * (P3 + tt * (P4 + tt * P5))));
	const r = (z * t1) / (t1 - 2.0) - (w + z * w);
	return scalbn(1.0 - (r - z), n);
}
