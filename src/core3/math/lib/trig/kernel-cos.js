/**
 * cos(x + y) on [-pi/4, pi/4], where y is the tail of a reduced argument
 * (fdlibm __kernel_cos).
 */
function kernelCos(x, y) {
	const C1 = 4.16666666666666019037e-2;
	const C2 = -1.38888888888741095749e-3;
	const C3 = 2.48015872894767294178e-5;
	const C4 = -2.75573143513906633035e-7;
	const C5 = 2.0875723212981748279e-9;
	const C6 = -1.13596475577881948265e-11;
	const z = x * x;
	const w = z * z;
	const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
	const hz = 0.5 * z;
	const v = 1.0 - hz;
	return v + (1.0 - v - hz + (z * r - x * y));
}
