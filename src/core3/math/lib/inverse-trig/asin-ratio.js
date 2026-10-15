/** The rational approximation R(z) that asin and acos share: asin(x) ~ x + x*R(x^2) (fdlibm). */
function asinRatio(z) {
	const pS0 = 1.66666666666666657415e-1;
	const pS1 = -3.25565818622400915405e-1;
	const pS2 = 2.01212532134862925881e-1;
	const pS3 = -4.00555345006794114027e-2;
	const pS4 = 7.91534994289814532176e-4;
	const pS5 = 3.4793310759602116757e-5;
	const qS1 = -2.40339491173441421878;
	const qS2 = 2.02094576023350569471;
	const qS3 = -6.8828397160545329303e-1;
	const qS4 = 7.70381505559019352791e-2;
	const p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))));
	const q = 1.0 + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)));
	return p / q;
}
