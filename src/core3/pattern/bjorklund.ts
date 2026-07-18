/**
 * Bjorklund's algorithm: distribute k onsets as evenly as possible over
 * `steps` slots. Returns the canonical mask — bjorklund(3, 8) = x..x..x.
 */

export function bjorklund(k: number, steps: number): boolean[] {
	if (!Number.isInteger(k) || !Number.isInteger(steps) || steps <= 0 || k < 0 || k > steps) {
		throw new Error(`bjorklund: invalid (k=${k}, steps=${steps})`);
	}
	if (k === 0) return new Array(steps).fill(false);

	let groups: boolean[][] = Array.from({ length: k }, () => [true]);
	let remainder: boolean[][] = Array.from({ length: steps - k }, () => [false]);
	while (remainder.length > 1 && groups.length > 0) {
		const pairs = Math.min(groups.length, remainder.length);
		const paired: boolean[][] = [];
		for (let i = 0; i < pairs; i++) {
			const head = groups[i];
			const tail = remainder[i];
			if (head && tail) paired.push(head.concat(tail));
		}
		const leftover =
			groups.length > remainder.length ? groups.slice(pairs) : remainder.slice(pairs);
		groups = paired;
		remainder = leftover;
	}
	return groups.concat(remainder).flat();
}
