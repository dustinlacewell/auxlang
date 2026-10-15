/**
 * What the printer resolves names through while pasting one function: every
 * identifier it writes comes from these maps (or is `Math`), never from the
 * source text.
 */

import type { ParamRoles } from "../../../module/tick-subset/subset-context";
import type { NameTable } from "../name-table";

/** The locals standing in for a tick's objects: `s.f`, `i.port`, `o.port`, `cfg.f`. */
export interface FieldLocals {
	/** The local for state field `field`; `write` marks it for store-back. */
	state(field: string, write: boolean): string;
	input(port: string): string;
	output(port: string): string;
	config(field: string): string;
}

export interface PasteContext {
	readonly names: NameTable;
	/** Declared locals and plain parameters → generated names. */
	readonly locals: ReadonlyMap<string, string>;
	/** Source labels → generated labels, filled as labelled statements print. */
	readonly labels: Map<string, string>;
	/** The tick's object parameters; empty for a helper. */
	readonly roles: ParamRoles;
	/** Null for a helper, which has no objects. */
	readonly fields: FieldLocals | null;
	/** Helper names → their pasted function names. */
	readonly helpers: ReadonlyMap<string, string>;
	/** Scope name of `hashRandom`; null in a helper. */
	readonly hashRandom: string | null;
	/** Tick: the label a `return` breaks out of. Helper: null, `return` stays. */
	readonly exit: string | null;
}
