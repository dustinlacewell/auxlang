import type { PlaybackState } from "@/ui/audio/types";
import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { useCallback, useState } from "react";

const DEFAULT_CODE = `
let clk = clock(130)

// Pentatonic bass line (A minor pentatonic)
let bass = seq("a1 ~ c2 d2 ~ e2 g2 ~", { clk })
bass
  .saw()
  .lpf({ cutoff: 600, resonance: 0.2 })
  .gain(bass.gate.adsr({ attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.1 }))
  .out()

// Hi-hats, offbeat 16ths
seq("~ c4", { clk: clockMult(clk).by(4) })
  .trig
  .hihat({ decay: 0.03, tone: 0.7 })
  .gain({ amount: 0.6 })
  .out()`;

interface EditorState {
	code: string;
	setCode: (code: string) => void;
	state: PlaybackState;
	error: string | null;
	run: () => Promise<void>;
	stop: () => void;
}

export function useEditorState(defaultCode: string = DEFAULT_CODE): EditorState {
	const [code, setCode] = useState(defaultCode);
	const { getState, play, stop } = useCore2Audio();

	const run = useCallback(async () => {
		await play("main", code);
	}, [code, play]);

	const instanceState = getState("main");

	return {
		code,
		setCode,
		state: instanceState.state,
		error: instanceState.error ?? null,
		run,
		stop: () => stop("main"),
	};
}
