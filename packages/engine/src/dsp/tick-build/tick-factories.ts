/**
 * The tick factory behind each built tick that keeps math call caches
 * (build-tick.ts). Each factory call makes a tick with its own caches; a
 * generated driver makes one per lane, so lanes never evict each other's
 * cached results. A tick without caches has no factory: one tick serves
 * every lane.
 */

type Factory = () => unknown;

const factories = new WeakMap<object, Factory>();

export function registerTickFactory(tick: object, factory: Factory): void {
	factories.set(tick, factory);
}

/** The factory that made `tick`, when its module keeps math call caches. */
export function tickFactory(tick: object): Factory | undefined {
	return factories.get(tick);
}
