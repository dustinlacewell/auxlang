import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly, type StereoGraph } from "@/core2/graph/expand-poly";
import type { FlatGraph } from "@/core2/graph/flat-graph";
import type { PlaybackState } from "@/ui/audio/types";
import { useCore2Audio } from "@/ui/audio/use-core2-audio";
import { useCallback, useState } from "react";

const DEFAULT_CODE = `let clk = clock(180)

clk
  .seq("a1 ~ c2 d2 ~ e2 <g2 [g3 g2]> ~")
  .apply(s=>s
  .saw()
  .lpf(600, 0.2)
  .gain(s.gate.adsr(0.01, 0.2, 0.4, 0.1))
  .nativeReverb()
  .gain(0.3)
  .out())

clk
  .clockMult(2)
  .seq("c4 c4 c4?.8 c4 c4*4?")
  .trig
  .hihat({ decay: 0.1, tone: 0.7 })
  .gain(0.6)
  .out()

clk
  .clockDiv(4)
  .seq("{<c4 c3>,<e4 [e3 f3]>,<g4 g3>}")
  .apply(s=>s
    .cv
    .tri()
    .gain(s.gate.adsr())
    .tape()
    .out())`;

interface EditorState {
	code: string;
	setCode: (code: string) => void;
	state: PlaybackState;
	error: string | null;
	run: () => Promise<void>;
	stop: () => void;
	graphId: string | undefined;
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
		graphId: instanceState.graphId,
		preGraph,
		stereoGraph,
	};
}
