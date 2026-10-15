/**
 * The values a generated driver closes over. Emitters bind each pre-built
 * object (tick fn, state, ins/outs record, config, lambda slot, lane view)
 * under a generated identifier and refer to it by that name in the source.
 * The scope only records the bindings: each code unit (code-unit.ts) takes
 * the names bound while it was emitted as its parameters, and the values
 * travel as binding paths (binding-path.ts), not as objects.
 */

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export interface Binding {
	readonly name: string;
	readonly value: unknown;
}

export class DriverScope {
	private readonly bindings: Binding[] = [];
	private readonly taken = new Set<string>();

	/** Bind `value` under `name` (an emitter-generated identifier); returns the name. */
	bind(name: string, value: unknown): string {
		if (!IDENTIFIER.test(name) || this.taken.has(name)) {
			throw new Error(`codegen: bad or duplicate scope name '${name}'`);
		}
		this.taken.add(name);
		this.bindings.push({ name, value });
		return name;
	}

	/** A point to roll back to, or to list the bindings made since. */
	mark(): number {
		return this.bindings.length;
	}

	rollback(mark: number): void {
		for (const { name } of this.bindings.splice(mark)) this.taken.delete(name);
	}

	/** The bindings made since `mark`, in order. */
	since(mark: number): readonly Binding[] {
		return this.bindings.slice(mark);
	}
}
