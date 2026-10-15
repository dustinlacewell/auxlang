/**
 * x rounded to its top 26 significant bits (a Veltkamp split by 2^27 + 1),
 * so the product of two such halves is exact. For |x| below about 2^995.
 */
function highBits26(x) {
	const c = x * 134217729;
	return c - (c - x);
}
