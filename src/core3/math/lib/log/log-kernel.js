/**
 * log(1 + f) - f + f^2/2 for f in [sqrt(2)/2 - 1, sqrt(2) - 1] (FreeBSD
 * k_log1p): the part of log(1 + f) that log2 and log10 add in low precision.
 */
function logKernel(f) {
	const Lg1 = 6.66666666666673513e-1;
	const Lg2 = 3.999999999940941908e-1;
	const Lg3 = 2.857142874366239149e-1;
	const Lg4 = 2.222219843214978396e-1;
	const Lg5 = 1.818357216161805012e-1;
	const Lg6 = 1.531383769920937332e-1;
	const Lg7 = 1.479819860511658591e-1;
	const s = f / (2.0 + f);
	const z = s * s;
	const w = z * z;
	const t1 = w * (Lg2 + w * (Lg4 + w * Lg6));
	const t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
	const R = t2 + t1;
	const hfsq = 0.5 * f * f;
	return s * (hfsq + R);
}
