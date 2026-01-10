import { useCallback, useState } from "react";
import { useAudioPlayer } from "./use-audio-player";
import type { PlaybackState } from "./types";

interface UseAuxEditorOptions {
	initialCode: string;
}

interface UseAuxEditorReturn {
	/** Current code in the editor */
	code: string;
	/** Update the code */
	setCode: (code: string) => void;
	/** Current playback state */
	state: PlaybackState;
	/** Error message if any */
	error: string | null;
	/** Run the current code */
	run: () => Promise<void>;
	/** Stop playback */
	stop: () => void;
	/** Whether currently playing */
	isPlaying: boolean;
}

/**
 * Hook that combines editor code state with audio playback.
 * Use this with CodeEditor to create embeddable auxlang editors.
 *
 * @example
 * ```tsx
 * function MyPlayer() {
 *   const { code, setCode, run, stop, isPlaying, error } = useAuxEditor({
 *     initialCode: "saw(440).out()"
 *   });
 *
 *   return (
 *     <div>
 *       <CodeEditor value={code} onChange={setCode} onRun={run} />
 *       <button onClick={run}>{isPlaying ? "Restart" : "Run"}</button>
 *       <button onClick={stop} disabled={!isPlaying}>Stop</button>
 *       {error && <div className="error">{error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuxEditor({ initialCode }: UseAuxEditorOptions): UseAuxEditorReturn {
	const [code, setCode] = useState(initialCode);
	const { state, error, play, stop } = useAudioPlayer();

	const run = useCallback(async () => {
		await play(code);
	}, [code, play]);

	return {
		code,
		setCode,
		state,
		error,
		run,
		stop,
		isPlaying: state === "playing",
	};
}
