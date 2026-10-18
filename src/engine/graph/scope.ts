/**
 * The sub-patch a node lives in. Each expanded sub-patch instance gets one
 * Scope; every node built inside it carries it, so identity can nest the
 * inner nodes' places under the instance's place (compile/first-paths). A
 * node outside every sub-patch has no scope.
 *
 * An instance's `.id(name)` and `.seed(n)` live on its scope: the pin roots
 * the inner places, and the seed is every inner node's seed unless a scope
 * or node nearer to it sets its own.
 */

export interface Scope {
	/** The sub-patch module's name. */
	readonly module: string;
	/** The scope the instance itself lives in. */
	readonly parent?: Scope;
	/** The instance's `.id()` pin: inner places hang under it, not under the instance's position. */
	readonly pin?: string;
	/** The instance's `.seed()`: the seed of every node built inside. */
	readonly seed?: number;
}

/** The fields a node built in `scope` carries: the scope, and the nearest seed set on it or around it. */
export function inScope(scope: Scope | undefined | null): { scope?: Scope; seed?: number } {
	if (!scope) return {};
	const seed = scopeChain(scope).find((s) => s.seed !== undefined)?.seed;
	return seed === undefined ? { scope } : { scope, seed };
}

/** The scope chain, innermost first. */
export function scopeChain(scope: Scope | undefined): Scope[] {
	const chain: Scope[] = [];
	for (let s = scope; s !== undefined; s = s.parent) chain.push(s);
	return chain;
}
