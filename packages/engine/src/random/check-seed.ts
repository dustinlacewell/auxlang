/**
 * A seed is an integer. Every random hash folds it to 32 bits, so a fraction
 * would silently drop its fractional part; that is a loud error naming `where`.
 */
export function checkSeed(n: unknown, where: string): number {
	if (typeof n !== "number" || !Number.isInteger(n)) {
		throw new Error(`${where}: a seed must be an integer, got ${String(n)}`);
	}
	return n;
}
