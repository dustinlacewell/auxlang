/** Tangent (fdlibm s_tan): reduce by pi/2; odd quadrants take -1/tan. */
function tan(x) {
	const ax = Math.abs(x);
	if (ax < 0.7853984832763672) {
		if (ax < 7.450580596923828e-9) return x;
		return kernelTan(x, 0, 0);
	}
	if (!(ax < Infinity)) return x - x;
	const n = remPio2(x, 0);
	return kernelTan(remPio2(x, 1), remPio2(x, 2), n & 1);
}
