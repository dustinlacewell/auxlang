/**
 * User patches, persisted to localStorage under one JSON key. Pure
 * read/decode and write/encode at the edges; everything else is plain data.
 */

export interface SavedPatch {
	readonly id: string;
	readonly name: string;
	readonly source: string;
	readonly updatedAt: number;
}

const STORAGE_KEY = "auxlang:saved-patches";

function readAll(): readonly SavedPatch[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeAll(patches: readonly SavedPatch[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(patches));
}

/** All saved patches, newest edit first. */
export function listSavedPatches(): readonly SavedPatch[] {
	return [...readAll()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Adds a new saved patch and returns it. */
export function createSavedPatch(name: string, source: string): SavedPatch {
	const patch: SavedPatch = { id: crypto.randomUUID(), name, source, updatedAt: Date.now() };
	writeAll([...readAll(), patch]);
	return patch;
}

/** Adds a new saved patch named "untitled patch", or "untitled patch N" if that's taken. */
export function createUntitledSavedPatch(source: string): SavedPatch {
	const taken = new Set(readAll().map((p) => p.name));
	let name = "untitled patch";
	for (let n = 2; taken.has(name); n++) name = `untitled patch ${n}`;
	return createSavedPatch(name, source);
}

/** Overwrites one saved patch's source, bumping its updatedAt. Unknown id is a no-op. */
export function updateSavedPatchSource(id: string, source: string): void {
	writeAll(readAll().map((p) => (p.id === id ? { ...p, source, updatedAt: Date.now() } : p)));
}

/** Renames one saved patch. Unknown id is a no-op. */
export function renameSavedPatch(id: string, name: string): void {
	writeAll(readAll().map((p) => (p.id === id ? { ...p, name } : p)));
}

/** Removes one saved patch. Unknown id is a no-op. */
export function removeSavedPatch(id: string): void {
	writeAll(readAll().filter((p) => p.id !== id));
}
