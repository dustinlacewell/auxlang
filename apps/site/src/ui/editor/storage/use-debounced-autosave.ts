/**
 * Writes `source` to one saved patch after edits settle, so typing never
 * fires a localStorage write per keystroke.
 */

import { useEffect, useRef } from "react";

const AUTOSAVE_DEBOUNCE_MS = 500;

export function useDebouncedAutosave(
	id: string | null,
	source: string,
	save: (id: string, source: string) => void,
): void {
	const saveRef = useRef(save);
	saveRef.current = save;

	useEffect(() => {
		if (!id) return;
		const timer = setTimeout(() => saveRef.current(id, source), AUTOSAVE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [id, source]);
}
