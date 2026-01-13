import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly, type StereoGraph } from "@/core2/graph/expand-poly";
import type { FlatGraph } from "@/core2/graph/flat-graph";
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
	/** Pre-expansion graph (before poly expansion) */
	preGraph: FlatGraph | null;
	/** Post-expansion stereo graph */
	stereoGraph: StereoGraph | null;
}

export function useEditorState(defaultCode: string = DEFAULT_CODE): EditorState {
	const [code, setCode] = useState(defaultCode);
	const [preGraph, setPreGraph] = useState<FlatGraph | null>(null);
	const [stereoGraph, setStereoGraph] = useState<StereoGraph | null>(null);
	const { getState, play, stop } = useCore2Audio();

	const run = useCallback(async () => {
		try {
			// Evaluate code and capture intermediate graphs
			reset();
			runCode(code, api);
			const graph = collect();
			setPreGraph(graph);

			const expanded = expandPoly(graph);
			setStereoGraph(expanded);

			// Play audio
			await play("main", code);
		} catch (err) {
			// Error will be captured by play(), but clear graphs on error
			setPreGraph(null);
			setStereoGraph(null);
			await play("main", code); // Let play handle the error state
		}
	}, [code, play]);

	const instanceState = getState("main");

	return {
		code,
		setCode,
		state: instanceState.state,
		error: instanceState.error ?? null,
		run,
		stop: () => stop("main"),
		preGraph,
		stereoGraph,
	};
}
