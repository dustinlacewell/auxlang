import { fnv1a32 } from "./fnv1a32";

/** FNV-1a of a string as 8 lowercase hex digits. */
export function fnv1aHex(s: string): string {
	return fnv1a32(s).toString(16).padStart(8, "0");
}
