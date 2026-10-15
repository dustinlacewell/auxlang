/** Cosine (fdlibm s_cos): reduce by pi/2, then the cos or sin kernel by quadrant. */
function cos(x) {
	const ax = Math.abs(x);
	if (ax < 0.7853984832763672) {
		if (ax < 1.0536709282860102e-8) return 1.0;
		return kernelCos(x, 0);
	}
	if (!(ax < Infinity)) return x - x;
	const n = remPio2(x, 0);
	const y0 = remPio2(x, 1);
	const y1 = remPio2(x, 2);
	switch (n & 3) {
		case 0:
			return kernelCos(y0, y1);
		case 1:
			return -kernelSin(y0, y1, 1);
		case 2:
			return -kernelCos(y0, y1);
		default:
			return kernelSin(y0, y1, 1);
	}
}
