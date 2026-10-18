/**
 * Which patch was open last, persisted to localStorage so a reload returns
 * to it instead of always the default example.
 */

import type { OpenPatch } from "../patch-sidebar";

const STORAGE_KEY = "auxlang:last-open-patch";

export function readLastOpenPatch(): OpenPatch | null {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (parsed?.kind === "example" && typeof parsed.name === "string") return parsed;
		if (parsed?.kind === "saved" && typeof parsed.id === "string") return parsed;
		return null;
	} catch {
		return null;
	}
}

export function writeLastOpenPatch(patch: OpenPatch | null): void {
	if (patch) localStorage.setItem(STORAGE_KEY, JSON.stringify(patch));
	else localStorage.removeItem(STORAGE_KEY);
}
