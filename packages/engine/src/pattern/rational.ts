/**
 * Exact rational arithmetic for pattern time.
 * R is JSON-serializable plain data: { n, d }, always normalized (d > 0, gcd(n,d) = 1).
 */

export interface R {
	readonly n: number;
	readonly d: number;
}

function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b) [a, b] = [b, a % b];
	return a || 1;
}

export function r(n: number, d = 1): R {
	if (d === 0) throw new Error("rational: zero denominator");
	if (!Number.isInteger(n) || !Number.isInteger(d)) {
		// Accept common decimals by scaling (e.g. 0.75 -> 3/4)
		const scale = 10 ** 9;
		return r(Math.round(n * scale), Math.round(d * scale));
	}
	if (d < 0) {
		n = -n;
		d = -d;
	}
	const g = gcd(n, d);
	return { n: n / g, d: d / g };
}

export const R0 = r(0);
export const R1 = r(1);

export const radd = (a: R, b: R): R => r(a.n * b.d + b.n * a.d, a.d * b.d);
export const rsub = (a: R, b: R): R => r(a.n * b.d - b.n * a.d, a.d * b.d);
export const rmul = (a: R, b: R): R => r(a.n * b.n, a.d * b.d);
export const rdiv = (a: R, b: R): R => {
	if (b.n === 0) throw new Error("rational: divide by zero");
	return r(a.n * b.d, a.d * b.n);
};

/** Least common multiple of two positive rationals: lcm(a/b, c/d) = lcm(a, c) / gcd(b, d). */
export const rlcm = (a: R, b: R): R => r((a.n / gcd(a.n, b.n)) * b.n, gcd(a.d, b.d));

/** a <=> b : negative, zero, positive */
export const rcmp = (a: R, b: R): number => a.n * b.d - b.n * a.d;
export const req = (a: R, b: R): boolean => rcmp(a, b) === 0;
export const rlt = (a: R, b: R): boolean => rcmp(a, b) < 0;
export const rlte = (a: R, b: R): boolean => rcmp(a, b) <= 0;
export const rmin = (a: R, b: R): R => (rcmp(a, b) <= 0 ? a : b);
export const rmax = (a: R, b: R): R => (rcmp(a, b) >= 0 ? a : b);

/** Integer floor of the rational value. */
export const rfloor = (a: R): number => Math.floor(a.n / a.d);

/** Fractional part in [0,1). */
export const rfrac = (a: R): R => rsub(a, r(rfloor(a)));

export const rtof = (a: R): number => a.n / a.d;

/**
 * The continued-fraction convergent of `x` with the largest denominator up to
 * `maxDen`: `0.333…` gives 1/3, `0.15` gives 3/20. Keeps a typed decimal from
 * becoming a 10^9 denominator that later products would overflow.
 */
export function rnear(x: number, maxDen: number): R {
	let [hPrev, h, kPrev, k] = [0, 1, 1, 0];
	let rest = x;
	for (let i = 0; i < 64; i++) {
		const a = Math.floor(rest);
		const kNext = a * k + kPrev;
		if (kNext > maxDen) break;
		[hPrev, h] = [h, a * h + hPrev];
		[kPrev, k] = [k, kNext];
		const frac = rest - a;
		if (frac < 1e-12 || Math.abs(h / k - x) < 1e-12) break;
		rest = 1 / frac;
	}
	return r(h, k);
}

/** Sample position (cycle number) of a point in time. */
export const rcycle = rfloor;
