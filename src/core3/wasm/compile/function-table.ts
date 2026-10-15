/**
 * The module's function index space and type section. Imports take the
 * first indices; defined functions follow in the order they are added. A
 * function can be reserved first and defined later (the render function,
 * whose body is emitted last but is called by index from the host).
 */

import type { DefinedFunc, FuncType } from "../encode/module-bytes";

export class FunctionTable {
	private readonly types: FuncType[] = [];
	private readonly funcs: (DefinedFunc | null)[] = [];

	constructor(private readonly importCount: number) {}

	typeIndex(params: readonly number[], results: readonly number[]): number {
		const key = (t: FuncType) => `${t.params.join(",")}>${t.results.join(",")}`;
		const wanted = key({ params, results });
		const found = this.types.findIndex((t) => key(t) === wanted);
		if (found >= 0) return found;
		this.types.push({ params: [...params], results: [...results] });
		return this.types.length - 1;
	}

	reserve(): number {
		this.funcs.push(null);
		return this.importCount + this.funcs.length - 1;
	}

	define(index: number, fn: DefinedFunc): void {
		this.funcs[index - this.importCount] = fn;
	}

	add(fn: DefinedFunc): number {
		const index = this.reserve();
		this.define(index, fn);
		return index;
	}

	allTypes(): readonly FuncType[] {
		return this.types;
	}

	allFuncs(): readonly DefinedFunc[] {
		return this.funcs.map((fn, k) => {
			if (fn === null)
				throw new Error(`wasm: function ${k + this.importCount} was reserved but never defined`);
			return fn;
		});
	}
}
