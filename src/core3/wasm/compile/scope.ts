/** JS block scoping for the compiler: each block names its own values, inner shadows outer. */

import type { Value } from "./values";

export class Scope {
	private readonly names = new Map<string, Value>();

	constructor(private readonly parent: Scope | null = null) {}

	lookup(name: string): Value | undefined {
		return this.names.get(name) ?? this.parent?.lookup(name);
	}

	declare(name: string, value: Value): void {
		this.names.set(name, value);
	}

	child(): Scope {
		return new Scope(this);
	}
}
