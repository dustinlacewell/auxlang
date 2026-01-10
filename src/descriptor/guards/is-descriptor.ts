import type { AnyDescriptor } from "../types";

export function isDescriptor(value: unknown): value is AnyDescriptor {
	if (typeof value !== "function") return false;
	const state = (value as AnyDescriptor)._state;
	return state !== undefined && typeof state === "object" && "id" in state;
}
