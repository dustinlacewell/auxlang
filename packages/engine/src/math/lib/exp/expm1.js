/**
 * e^x - 1, accurate near 0 (fdlibm s_expm1): x = k*ln2 + r, a rational
 * approximation of e^r - 1 with its rounding error carried in a correction
 * term, then scaled by 2^k.
 */
function expm1(x0) {
	const ln2Hi = 6.9314718036912381649e-1;
	const ln2Lo = 1.90821492927058770002e-10;
	const invln2 = 1.442695040888963387;
	const Q1 = -3.33333333333331316428e-2;
	const Q2 = 1.58730158725481460165e-3;
	const Q3 = -7.93650757867487942473e-5;
	const Q4 = 4.00821782732936239552e-6;
	const Q5 = -2.01099218183624371326e-7;
	let x = x0;
	if (x !== x) return x;
	const ax = Math.abs(x);
	if (ax >= 38.81622314453125) {
		if (ax >= 709.7822265625) {
			if (x === Infinity) return x;
			if (x === -Infinity) return -1.0;
			if (x > 7.09782712893383973096e2) return Infinity;
		}
		if (x < 0) return -1.0;
	}
	let k = 0;
	let c = 0;
	if (ax >= 0.3465735912322998) {
		let hi = 0;
		let lo = 0;
		if (ax < 1.0397205352783203) {
			if (x > 0) {
				hi = x - ln2Hi;
				lo = ln2Lo;
				k = 1;
			} else {
				hi = x + ln2Hi;
				lo = -ln2Lo;
				k = -1;
			}
		} else {
			k = Math.trunc(invln2 * x + (x < 0 ? -0.5 : 0.5));
			hi = x - k * ln2Hi;
			lo = k * ln2Lo;
		}
		x = hi - lo;
		c = hi - x - lo;
	} else if (ax < 5.551115123125783e-17) {
		return x;
	}
	const hfx = 0.5 * x;
	const hxs = x * hfx;
	const r1 = 1.0 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
	const t = 3.0 - r1 * hfx;
	let e = hxs * ((r1 - t) / (6.0 - x * t));
	if (k === 0) return x - (x * e - hxs);
	e = x * (e - c) - c;
	e -= hxs;
	if (k === -1) return 0.5 * (x - e) - 0.5;
	if (k === 1) {
		if (x < -0.25) return -2.0 * (e - (x + 0.5));
		return 1.0 + 2.0 * (x - e);
	}
	if (k <= -2 || k > 56) {
		let y = 1.0 - (e - x);
		if (k === 1024) y = y * 2.0 * 8.98846567431158e307;
		else y = y * twoPow(k);
		return y - 1.0;
	}
	if (k < 20) {
		// 1 - 2^-k, exact
		const y = 1 - twoPow(-k) - (e - x);
		return y * twoPow(k);
	}
	const y = x - (e + twoPow(-k)) + 1.0;
	return y * twoPow(k);
}
