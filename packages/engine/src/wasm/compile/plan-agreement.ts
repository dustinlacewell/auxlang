/**
 * The plan's type and the kind WASM emits must agree at every expression:
 * a boolean is a `bool`; an `int` has a plan range inside int32; a `long`
 * has a plan range; an `f64` is a number. A mismatch is a compiler bug, so
 * it fails loudly rather than emitting code the checker did not type.
 */

import type { AnyNode } from "acorn";
import { fitsI32 } from "../../dsp/front/types/int-range";
import { emittedClass } from "../../dsp/front/types/ty";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

/** Returns `kind` when the plan's type of `node` agrees with it; fails otherwise. */
export function agreed(e: FnEmitter, node: AnyNode, kind: Kind): Kind {
	const reason = disagreement(e, node, kind);
	if (reason === null) return kind;
	return e.fail(node, `WASM emitted ${kind} for a ${node.type} the plan typed ${reason}`);
}

function disagreement(e: FnEmitter, node: AnyNode, kind: Kind): string | null {
	const cls = emittedClass(e.typeOf(node));
	if (kind === "bool") return cls === "bool" ? null : cls;
	if (cls !== "num") return cls;
	if (kind === "f64") return null;
	const range = e.range(node);
	if (range === null) return "a number with no integer range";
	if (kind === "int" && !fitsI32(range)) return "an integer that may leave int32";
	return null;
}
