/**
 * The closure scope of a generated driver. Emitters bind each pre-built
 * object (tick fn, state, ins/outs record, config, lambda slot, lane view)
 * under a generated identifier and refer to it by that name in the source.
 * `instantiate` is the single `new Function` call: the bound values become
 * the outer function's parameters, so the driver closes over them; the
 * prelude (pasted helpers) runs once in that outer function.
 */

import type { Driver } from "../driver";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

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

	/** Compile `body` as the block driver (driver.ts's `Driver`) over the bound values. */
	instantiate(prelude: string, body: string): Driver {
		const params = "bufs, outL, outR, offset, n, count, sr";
		const source = `"use strict";\n${prelude}\nreturn function driver(${params}) {\n${body}\n};`;
		const outer = new Function(...this.names, source) as (...values: unknown[]) => Driver;
		return outer(...this.values);
	}
}
