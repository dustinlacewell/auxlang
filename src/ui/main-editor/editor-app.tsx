import { graphToDot, stereoGraphToDot } from "@/core2/viz/graph-to-dot";
import { CodeEditor } from "@/ui/code-editor/code-editor";
import { GraphViewer } from "@/ui/core2-editor/graph-viewer";
import { ErrorDisplay } from "@/ui/design/error-display";
import { useMemo } from "react";
import { EditorControls } from "./editor-controls";
import { useEditorState } from "./use-editor-state";

export function EditorApp() {
	const { code, setCode, state, error, run, stop, preGraph, stereoGraph } = useEditorState();

	const preDot = useMemo(() => (preGraph ? graphToDot(preGraph, "Pre-expansion") : null), [preGraph]);

	const stereoDot = useMemo(() => (stereoGraph ? stereoGraphToDot(stereoGraph, "Post-expansion (Stereo)") : null), [stereoGraph]);

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Auxlang</h1>

			<div className="mb-4">
				<EditorControls onRun={run} onStop={stop} isPlaying={state === "playing"} />
			</div>

			<CodeEditor value={code} onChange={setCode} onRun={run} className="mb-4" />

			{error && <ErrorDisplay message={error} />}

			<div className="grid grid-cols-2 gap-4 mt-4">
				<div>
					<h2 className="text-lg font-semibold mb-2">Pre-expansion Graph</h2>
					<GraphViewer dot={preDot} className="h-96" />
				</div>
				<div>
					<h2 className="text-lg font-semibold mb-2">Post-expansion Graph</h2>
					<GraphViewer dot={stereoDot} className="h-96" />
				</div>
			</div>
		</div>
	);
}
