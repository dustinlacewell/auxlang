/**
 * x rounded to its top 21 significant bits (a Veltkamp split by 2^32 + 1).
 * It stands in for fdlibm's "clear the low word": a product of this with a
 * factor of up to 32 bits is exact. For |x| below about 2^990.
 */
function highBits21(x) {
	const c = x * 4294967297;
	return c - (c - x);
}
