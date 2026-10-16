/**
 * A variable or field keeps one type: each value stored in it must be of
 * that type, or no backend holding it in one slot can run the tick. A
 * number stays a number and a boolean a boolean (`true === 1` is false in
 * JS); a variable holding an array or record only takes one of the same type
 * and length, so every engine reads it at a run-time address the same way; a
 * string only exists while compiling, so it is never stored, nor is one of
 * a tick's parameter records (a `const` names it, module/roles.ts). A typed
 * array's element converts what it is given (its place is `unknown`), so it
 * takes any number or boolean, and an array or record there is used as a
 * number. A record in an array of records is a place of the record's type.
 * Returns the loud error, or null when the store unifies.
 */

import { type RefShape, type Ty, tyKey } from "./ty";

export const STORED =
	"a boolean stored where a number is kept — JS keeps the boolean (`true === 1` is false); write `cond ? 1 : 0` for a number, or keep the boolean in a `const`/`let` of its own";

export const INTO_BOOLEAN =
	"a number stored in a boolean variable — a variable keeps the type it starts with; start it as a number (`let x = 0`)";

export const REBOUND =
	"a variable holding an array or record takes only an array or record of the same type and length";

export const REF_STORED =
	"an array or record stored where a number is kept — a variable keeps the type it starts with";

export const STRING_STORED =
	"a string stored at run time — strings exist only while compiling; keep it in a `const` or a `let` that is never reassigned";

export const STRUCTURED_OPERAND =
	"an array or record used as a number — read one of its elements or fields";

export const ROLE_STORED =
	"a parameter record stored in a variable, field or element — read its fields, or name it with a `const`";

export function unify(place: Ty, value: Ty): string | null {
	if (value.k === "role") return ROLE_STORED;
	if (place.k === "ref") return value.k === "ref" && sameShape(place.shape, value.shape) ? null : REBOUND;
	if (value.k === "ref") return place.k === "unknown" ? STRUCTURED_OPERAND : REF_STORED;
	if (value.k === "static" && typeof value.v === "string") return STRING_STORED;
	const p = classOf(place);
	const v = classOf(value);
	if (p === "num" && v === "bool") return STORED;
	if (p === "bool" && v === "num") return INTO_BOOLEAN;
	return null;
}

function sameShape(a: RefShape, b: RefShape): boolean {
	return tyKey({ k: "ref", shape: a, placed: false }) === tyKey({ k: "ref", shape: b, placed: false });
}

function classOf(ty: Ty): "num" | "bool" | null {
	if (ty.k === "num" || ty.k === "bool") return ty.k;
	if (ty.k !== "static") return null;
	if (typeof ty.v === "boolean") return "bool";
	return typeof ty.v === "number" ? "num" : null;
}
