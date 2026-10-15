/**
 * tan(x + y) on [-pi/4, pi/4], or -1/tan(x + y) when `odd` is 1 (fdlibm
 * __kernel_tan). Near +-pi/4 it works on pi/4 - |x| for accuracy.
 */
function kernelTan(x0, y0, odd) {
	const T0 = 3.33333333333334091986e-1;
	const T1 = 1.33333333333201242699e-1;
	const T2 = 5.39682539762260521377e-2;
	const T3 = 2.18694882948595424599e-2;
	const T4 = 8.86323982359930005737e-3;
	const T5 = 3.59207910759131235356e-3;
	const T6 = 1.45620945432529025516e-3;
	const T7 = 5.88041240820264096874e-4;
	const T8 = 2.46463134818469906812e-4;
	const T9 = 7.817944429395570923e-5;
	const T10 = 7.14072491382608190305e-5;
	const T11 = -1.85586374855275456654e-5;
	const T12 = 2.59073051863633712884e-5;
	const pio4 = 7.85398163397448278999e-1;
	const pio4lo = 3.06161699786838301793e-17;
	let x = x0;
	let y = y0;
	const big = Math.abs(x) >= 0.6743354797363281;
	const negative = x < 0;
	if (big) {
		if (negative) {
			x = -x;
			y = -y;
		}
		x = pio4 - x + (pio4lo - y);
		y = 0.0;
	}
	const z = x * x;
	const w = z * z;
	let r = T1 + w * (T3 + w * (T5 + w * (T7 + w * (T9 + w * T11))));
	let v = z * (T2 + w * (T4 + w * (T6 + w * (T8 + w * (T10 + w * T12)))));
	const s = z * x;
	r = y + z * (s * (r + v) + y) + s * T0;
	const sum = x + r;
	if (big) {
		const sign = 1 - 2 * odd;
		v = sign - 2.0 * (x + (r - (sum * sum) / (sum + sign)));
		return negative ? -v : v;
	}
	if (odd === 0) return sum;
	// -1/(x + r) has up to 2 ulp error, so compute it in split precision.
	const w0 = highBits26(sum);
	v = r - (w0 - x);
	const a = -1.0 / sum;
	const a0 = highBits26(a);
	return a0 + a * (1.0 + a0 * w0 + a0 * v);
}
