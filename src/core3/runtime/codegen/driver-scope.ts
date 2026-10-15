/**
 * The closure scope of a generated driver. Emitters bind each pre-built
 * object (tick fn, state, ins/outs record, config, lambda slot, lane view)
 * under a generated identifier and refer to it by that name in the source.
 * `instantiate` is the single `new Function` call. The source has three
 * parts: `shared` code that uses no bound value (pasted helpers) runs once;
 * an instance function takes the bound values as parameters and runs the
 * `prelude` (group functions) once per instance; the driver it returns runs
 * `body` and closes over both. `instantiateTwins` makes a second instance
 * over a shadow copy of the values.
 */

import type { Driver } from "../driver";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export interface DriverSource {
	/** Code that uses no bound value; one copy serves every instance. */
	readonly shared: string;
	/** Code run once per instance, over the bound values. */
	readonly prelude: string;
	/** The driver's body. */
	readonly body: string;
}

type Instance = (...values: unknown[]) => Driver;

export class DriverScope {
	private readonly names: string[] = [];
	private readonly values: unknown[] = [];
	private readonly taken = new Set<string>();

	/** Bind `value` under `name` (an emitter-generated identifier); returns the name. */
	bind(name: string, value: unknown): string {
		if (!IDENTIFIER.test(name) || this.taken.has(name)) {
			throw new Error(`codegen: bad or duplicate scope name '${name}'`);
		}
		this.taken.add(name);
		this.names.push(name);
		this.values.push(value);
		return name;
	}

	/** A point to roll back to when an emitter abandons what it bound. */
	mark(): number {
		return this.names.length;
	}

	rollback(mark: number): void {
		for (const name of this.names.splice(mark)) this.taken.delete(name);
		this.values.splice(mark);
	}

	/** Compile `source` as the block driver (driver.ts's `Driver`) over the bound values. */
	instantiate(source: DriverSource): Driver {
		return this.compile(source)(...this.values);
	}

	/**
	 * Compile once, instantiate twice: the driver over the bound values, and a
	 * shadow driver over `shadowOf` each value. The two instances' functions
	 * come from one source, so V8 shares their type feedback and optimized
	 * code: running the shadow warms the real driver.
	 */
	instantiateTwins(
		source: DriverSource,
		shadowOf: (value: unknown) => unknown,
	): { readonly real: Driver; readonly shadow: Driver } {
		const instance = this.compile(source);
		return { real: instance(...this.values), shadow: instance(...this.values.map(shadowOf)) };
	}

	private compile(source: DriverSource): Instance {
		const params = "bufs, outL, outR, offset, n, count, sr";
		const text = [
			'"use strict";',
			source.shared,
			`return function instance(${this.names.join(", ")}) {`,
			source.prelude,
			`return function driver(${params}) {`,
			source.body,
			"};",
			"};",
		].join("\n");
		return (new Function(text) as () => Instance)();
	}
}
