/**
 * Test support: compile chosen helpers or runtime functions into a module
 * that exports them, so a test can call the WASM build of a function next
 * to its JS original.
 */

import type { Calls, FnRef } from "@/core3/wasm/compile/emit-context";
import { FunctionTable } from "@/core3/wasm/compile/function-table";
import { Functions } from "@/core3/wasm/compile/functions";
import { helperSet } from "@/core3/wasm/compile/helper-set";
import { moduleBytes } from "@/core3/wasm/encode/module-bytes";

type Exported = (...args: number[]) => number;

export function exportFunctions(
	pick: (calls: Calls) => Record<string, FnRef>,
	texts: Readonly<Record<string, string>> = {},
): Record<string, Exported> {
	const table = new FunctionTable(0);
	const fns = new Functions(table);
	const refs = pick(fns.calls(helperSet("test", texts)));
	const bytes = moduleBytes({
		types: table.allTypes(),
		imports: [],
		funcs: table.allFuncs(),
		memoryPages: 1,
		exports: Object.entries(refs).map(([name, ref]) => ({
			name,
			kind: 0 as const,
			index: ref.index,
		})),
	});
	const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
	return instance.exports as unknown as Record<string, Exported>;
}
