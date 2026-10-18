/**
 * sin(x + y) on [-pi/4, pi/4], where y is the tail of a reduced argument
 * (fdlibm __kernel_sin). `iy` is 0 when y is known to be 0.
 */
function kernelSin(x, y, iy) {
	const S1 = -1.66666666666666324348e-1;
	const S2 = 8.33333333332248946124e-3;
	const S3 = -1.98412698298579493134e-4;
	const S4 = 2.75573137070700676789e-6;
	const S5 = -2.50507602534068634195e-8;
	const S6 = 1.58969099521155010221e-10;
	const z = x * x;
	const w = z * z;
	const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
	const v = z * x;
	if (iy === 0) return x + v * (S1 + z * r);
	return x - (z * (0.5 * y - v * r) - y - v * S1);
}
