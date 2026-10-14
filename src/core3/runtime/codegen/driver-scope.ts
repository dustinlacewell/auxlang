/**
 * The closure scope of a generated driver. Emitters bind each pre-built
 * object (tick fn, state, ins/outs record, config, lambda slot, lane view)
 * under a generated identifier and refer to it by that name in the source.
 * `instantiate` is the single `new Function` call: the bound values become
 * the outer function's parameters, so the driver closes over them.
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

	/** Compile `body` as the driver `(cur, prv, sr, time) => void` over the bound values. */
	instantiate(body: string): Driver {
		const source = `"use strict";\nreturn function driver(cur, prv, sr, time) {\n${body}\n};`;
		const outer = new Function(...this.names, source) as (...values: unknown[]) => Driver;
		return outer(...this.values);
	}
}
