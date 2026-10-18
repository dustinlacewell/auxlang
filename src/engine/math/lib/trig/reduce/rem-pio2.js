/**
 * Reduce x by multiples of pi/2: x = n*(pi/2) + y0 + y1 with |y0 + y1| <=
 * ~pi/4 (fdlibm __rem_pio2). A helper returns one number, so `part` picks
 * it: 0 gives n, 1 gives y0, 2 gives the tail y1. For |x| up to 2^20*(pi/2)
 * it subtracts a three-piece pi/2 (Cody-Waite), more pieces as cancellation
 * grows; beyond that it hands off to the Payne-Hanek reduction.
 */
function remPio2(x, part) {
	const ax = Math.abs(x);
	if (!(ax < 1647099)) {
		if (!(ax < Infinity)) return part === 0 ? 0 : x - x;
		return remPio2Large(x, part);
	}
	const invpio2 = 6.36619772367581382433e-1;
	const pio2_1 = 1.57079632673412561417;
	const pio2_1t = 6.07710050650619224932e-11;
	const pio2_2 = 6.0771005063039659766e-11;
	const pio2_2t = 2.02226624879595063154e-21;
	const pio2_3 = 2.0222662487111664558e-21;
	const pio2_3t = 8.47842766036889956997e-32;
	// Round to nearest integer, ties to even: adding 1.5 * 2^52 drops the fraction.
	const fn = x * invpio2 + 6755399441055744 - 6755399441055744;
	if (part === 0) return fn;
	let r = x - fn * pio2_1;
	let w = fn * pio2_1t;
	let y0 = r - w;
	// fdlibm takes more pieces when y0's exponent is 16 (then 49) below x's;
	// comparing magnitudes takes them a little more often, which is only more exact.
	if (Math.abs(y0) < ax * 1.52587890625e-5) {
		let t = r;
		w = fn * pio2_2;
		r = t - w;
		w = fn * pio2_2t - (t - r - w);
		y0 = r - w;
		if (Math.abs(y0) < ax * 1.7763568394002505e-15) {
			t = r;
			w = fn * pio2_3;
			r = t - w;
			w = fn * pio2_3t - (t - r - w);
			y0 = r - w;
		}
	}
	if (part === 1) return y0;
	return r - y0 - w;
}
