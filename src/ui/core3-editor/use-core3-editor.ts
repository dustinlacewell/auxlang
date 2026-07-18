/**
 * Core3 editor controller: owns the code, the last compiled Program (for the
 * graph panel), playing state, and the verbatim eval/compile error. `run`
 * evaluates the patch and hands the Program to the audio host — re-running
 * while playing is a crossfade swap in the worklet, not a restart. `stop`
 * silences. Errors are the language's loud errors, surfaced unmodified.
 */

import type { Program } from "@/core3/api";
import { play, stop } from "@/core3/runtime/audio";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { useCallback, useState } from "react";
import { DEFAULT_EXAMPLE } from "./examples";

interface Core3EditorState {
	code: string;
	setCode: (code: string) => void;
	program: Program | null;
	error: string | null;
	isPlaying: boolean;
	run: () => Promise<void>;
	halt: () => void;
}

export function useCore3Editor(): Core3EditorState {
	const [code, setCode] = useState(DEFAULT_EXAMPLE);
	const [program, setProgram] = useState<Program | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	const run = useCallback(async () => {
		try {
			const compiled = evalPatch(code);
			setProgram(compiled);
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

	return { code, setCode, program, error, isPlaying, run, halt };
}
