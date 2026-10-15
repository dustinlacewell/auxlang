/**
 * The sub-patch a node lives in. Each expanded sub-patch instance gets one
 * Scope; every node built inside it carries it, so identity can nest the
 * inner nodes' places under the instance's place (compile/first-paths). A
 * node outside every sub-patch has no scope.
 */

export interface Scope {
	/** The sub-patch module's name. */
	readonly module: string;
	/** The scope the instance itself lives in. */
	readonly parent?: Scope;
}

/** The `scope` field to spread into a new node: present only when there is one. */
export function scoped(scope: Scope | undefined | null): { scope?: Scope } {
	return scope ? { scope } : {};
}

/** The scope chain, innermost first. */
export function scopeChain(scope: Scope | undefined): Scope[] {
	const chain: Scope[] = [];
	for (let s = scope; s !== undefined; s = s.parent) chain.push(s);
	return chain;
}
