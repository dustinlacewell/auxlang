/** Sine (fdlibm s_sin): reduce by pi/2, then the sin or cos kernel by quadrant. */
function sin(x) {
	const ax = Math.abs(x);
	if (ax < 0.7853984832763672) {
		if (ax < 1.4901161193847656e-8) return x;
		return kernelSin(x, 0, 0);
	}
	if (!(ax < Infinity)) return x - x;
	const n = remPio2(x, 0);
	const y0 = remPio2(x, 1);
	const y1 = remPio2(x, 2);
	switch (n & 3) {
		case 0:
			return kernelSin(y0, y1, 1);
		case 1:
			return kernelCos(y0, y1);
		case 2:
			return -kernelSin(y0, y1, 1);
		default:
			return -kernelCos(y0, y1);
	}
}
