/**
 * 2^y. Not a Math member: `pow(2, y)` and `2 ** y` both land here, so the
 * two spellings agree bit for bit.
 */
function exp2(y) {
	if (y !== y) return y;
	if (y >= 1024) return Infinity;
	if (y <= -1075) return 0;
	return exp2Split(y, 0);
}
