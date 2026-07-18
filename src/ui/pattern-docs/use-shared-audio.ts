/**
 * One shared audio host for the whole page. Run compiles the card's patch and
 * swaps it into the single worklet via core3's `play()` (which crossfades);
 * a second Run on a different card simply swaps again — no per-card contexts.
 * Compile/eval errors are the language's loud errors, surfaced per card.
 */

import { play, stop } from "@/core3/runtime/audio";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { useCallback, useState } from "react";

export interface SharedAudio {
	/** id of the card currently sounding, or null. */
	readonly playingId: string | null;
	/** id -> error message from the last failed Run. */
	readonly errors: Readonly<Record<string, string>>;
	run(id: string, code: string): void;
	halt(): void;
}

export function useSharedAudio(): SharedAudio {
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const run = useCallback((id: string, code: string) => {
		try {
			const program = evalPatch(code);
			void play(program);
			setErrors((prev) => clearKey(prev, id));
			setPlayingId(id);
		} catch (err) {
			setErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : String(err) }));
		}
	}, []);

	const halt = useCallback(() => {
		stop();
		setPlayingId(null);
	}, []);

	return { playingId, errors, run, halt };
}

function clearKey(map: Record<string, string>, key: string): Record<string, string> {
	if (!(key in map)) return map;
	const next = { ...map };
	delete next[key];
	return next;
}
