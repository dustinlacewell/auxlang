/**
 * Core3 editor controller: owns the code, playing state, and the verbatim
 * eval/compile error. `run` evaluates the patch and hands the Program to the
 * audio host — re-running while playing is a crossfade swap in the worklet,
 * not a restart. `stop` silences. Errors are the language's loud errors,
 * surfaced unmodified. (The graph renders from the code itself via PatchGraph
 * in the embed, so no compiled Program is held here.)
 */

import { play, stop } from "@/core3/runtime/audio";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { useCallback, useState } from "react";
import { DEFAULT_EXAMPLE } from "./examples";
import { codeFromUrl } from "./share-url";

interface Core3EditorState {
	code: string;
	setCode: (code: string) => void;
	error: string | null;
	isPlaying: boolean;
	run: () => Promise<void>;
	halt: () => void;
}

export function useCore3Editor(): Core3EditorState {
	const [code, setCode] = useState(() => codeFromUrl() ?? DEFAULT_EXAMPLE);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	const run = useCallback(async () => {
		try {
			const compiled = evalPatch(code);
			setError(null);
			await play(compiled);
			setIsPlaying(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}, [code]);

	const halt = useCallback(() => {
		stop();
		setIsPlaying(false);
	}, []);

	return { code, setCode, error, isPlaying, run, halt };
}
