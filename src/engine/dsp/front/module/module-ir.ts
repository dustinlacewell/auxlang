/**
 * A module's tick code, read once: each function parsed, its names resolved,
 * its writes listed and its helper calls known. Every later stage reads this,
 * never the text.
 */

import type { ParsedPart } from "@/engine/dsp/front/parse/parse-part";
import type { FunctionKind, HelperCallSite } from "@/engine/dsp/front/rules/rule-context";
import type { Scopes } from "@/engine/dsp/front/scope/binding";
import type { WriteSites } from "@/engine/dsp/front/scope/writes";

export interface ResolvedPart extends ParsedPart {
	readonly scopes: Scopes;
}

export interface FunctionIR extends ResolvedPart {
	readonly kind: FunctionKind;
	readonly writes: WriteSites;
	readonly calls: readonly HelperCallSite[];
}

export interface ModuleIR {
	readonly tick: FunctionIR;
	readonly helpers: ReadonlyMap<string, FunctionIR>;
}

/** What a module's functions are checked against, beside their own text. */
export interface ModuleFacts {
	/** `defmod('noise')`. */
	readonly owner: string;
	readonly ins: ReadonlySet<string>;
	readonly outs: ReadonlySet<string>;
	/** In-port names that are port groups. */
	readonly inGroups: ReadonlySet<string>;
	/** Out-port names that are port groups. */
	readonly outGroups: ReadonlySet<string>;
	/** A fresh state with the engine-injected fields, as the tick will see it. */
	readonly state: Record<string, unknown>;
	/** The module declares `reads: "pattern"` (table-intrinsics.ts). */
	readonly tables: boolean;
}
