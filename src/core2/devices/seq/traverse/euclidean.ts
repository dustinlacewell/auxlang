/**
 * Compute euclidean rhythm pattern using Bjorklund's algorithm.
 * Returns array of booleans: true = hit, false = rest
 *
 * @param hits - Number of hits to distribute
 * @param steps - Total number of steps
 */
export function euclidean(hits: number, steps: number): boolean[] {
	if (hits >= steps) return new Array(steps).fill(true) as boolean[];
	if (hits <= 0) return new Array(steps).fill(false) as boolean[];

	const pattern: boolean[] = [];
	const counts: number[] = [];
	const remainders: number[] = [hits];

	let divisor = steps - hits;
	let level = 0;

	while ((remainders[level] ?? 0) > 1) {
		const currentRemainder = remainders[level] ?? 1;
		counts.push(Math.floor(divisor / currentRemainder));
		const newRemainder = divisor % currentRemainder;
		divisor = currentRemainder;
		remainders.push(newRemainder);
		level++;
	}
	counts.push(divisor);

	function build(lvl: number): void {
		if (lvl === -1) {
			pattern.push(false);
		} else if (lvl === -2) {
			pattern.push(true);
		} else {
			for (let i = 0; i < (counts[lvl] ?? 0); i++) {
				build(lvl - 1);
			}
			if ((remainders[lvl] ?? 0) > 0) {
				build(lvl - 2);
			}
		}
	}

	build(level);
	return pattern;
}
