/**
 * e^x (fdlibm e_exp): x = k*ln2 + r with |r| <= ln2/2, a rational
 * approximation of e^r, then scaling by 2^k.
 */
function exp(x) {
	const ln2Hi = 6.9314718036912381649e-1;
	const ln2Lo = 1.90821492927058770002e-10;
	const invln2 = 1.442695040888963387;
	const P1 = 1.66666666666666019037e-1;
	const P2 = -2.77777777770155933842e-3;
	const P3 = 6.61375632143793436117e-5;
	const P4 = -1.6533902205465251539e-6;
	const P5 = 4.13813679705723846039e-8;
	if (x !== x) return x;
	const ax = Math.abs(x);
	if (ax >= 709.7822265625) {
		if (x === Infinity) return x;
		if (x === -Infinity) return 0;
		if (x > 7.09782712893383973096e2) return Infinity;
		if (x < -7.4513321910194110842e2) return 0;
	}
	let hi = 0;
	let lo = 0;
	let k = 0;
	let r = x;
	if (ax >= 0.3465735912322998) {
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
		r = hi - lo;
	} else if (ax < 3.725290298461914e-9) {
		return 1 + x;
	}
	const t = r * r;
	const c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
	if (k === 0) return 1 - ((r * c) / (c - 2.0) - r);
	const y = 1 - (lo - (r * c) / (2.0 - c) - hi);
	if (k >= -1021) {
		if (k === 1024) return y * 2.0 * 8.98846567431158e307;
		return y * twoPow(k);
	}
	return y * twoPow(k + 1000) * 9.332636185032189e-302;
}
