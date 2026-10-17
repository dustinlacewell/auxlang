/**
 * Reactive access to the saved-patches store: loads once on mount, and every
 * action re-reads so the list shown is always what's on disk.
 */

import { useCallback, useState } from "react";
import {
	type SavedPatch,
	createUntitledSavedPatch,
	listSavedPatches,
	removeSavedPatch,
	renameSavedPatch,
	updateSavedPatchSource,
} from "./saved-patches";

interface UseSavedPatches {
	patches: readonly SavedPatch[];
	createUntitled: (source: string) => SavedPatch;
	updateSource: (id: string, source: string) => void;
	rename: (id: string, name: string) => void;
	remove: (id: string) => void;
}

export function useSavedPatches(): UseSavedPatches {
	const [patches, setPatches] = useState<readonly SavedPatch[]>(() => listSavedPatches());

	const createUntitled = useCallback((source: string) => {
		const patch = createUntitledSavedPatch(source);
		setPatches(listSavedPatches());
		return patch;
	}, []);

	const updateSource = useCallback((id: string, source: string) => {
		updateSavedPatchSource(id, source);
		setPatches(listSavedPatches());
	}, []);

	const rename = useCallback((id: string, name: string) => {
		renameSavedPatch(id, name);
		setPatches(listSavedPatches());
	}, []);

	const remove = useCallback((id: string) => {
		removeSavedPatch(id);
		setPatches(listSavedPatches());
	}, []);

	return { patches, createUntitled, updateSource, rename, remove };
}
