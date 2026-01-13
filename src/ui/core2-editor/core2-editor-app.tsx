/**
 * Core2 Editor - editor with graph visualization tabs.
 */

import { useState } from "react";
import { CodeEditor } from "@/ui/code-editor/code-editor";
import { ErrorDisplay } from "@/ui/design/error-display";
import { Button } from "@/ui/design/button";
import { useCore2Eval } from "./use-core2-eval";
import { Tabs } from "./tabs";
import { GraphViewer } from "./graph-viewer";
import { JsonViewer } from "./json-viewer";

const DEFAULT_CODE = `// LFO modulating filter cutoff
const mod = lfo(2).scale({ min: 200, max: 2000 })
saw(440).lpf({ cutoff: mod }).gain(0.5).out()
`;

export function Core2EditorApp() {
	const [code, setCode] = useState(DEFAULT_CODE);
	const { result, error, rawDot, expandedDot, playbackState, evaluate, stopPlayback } = useCore2Eval();

	const handleRun = () => {
		evaluate(code);
	};

	const tabs = [
		{
			id: "raw-graph",
			label: "Raw Graph",
			content: <GraphViewer dot={rawDot} className="h-96" />,
		},
		{
			id: "expanded-graph",
			label: "Expanded Graph",
			content: <GraphViewer dot={expandedDot} className="h-96" />,
		},
		{
			id: "raw-json",
			label: "Raw JSON",
			content: <JsonViewer data={result?.graph ?? null} className="h-96" />,
		},
		{
			id: "expanded-json",
			label: "Expanded JSON",
			content: <JsonViewer data={result?.expanded ?? null} className="h-96" />,
		},
		{
			id: "runtime-json",
			label: "Runtime JSON",
			content: <JsonViewer data={result?.runtime ?? null} className="h-96" />,
		},
	];

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Auxlang Core2 Editor</h1>
			<p className="text-surface-400 mb-4">
				Plain data graphs with visualization. Press Cmd/Ctrl+Enter or click Play.
			</p>

			<div className="mb-4 flex gap-2">
				<Button onClick={handleRun}>
					{playbackState === "playing" ? "Update" : "Play"}
				</Button>
				{playbackState === "playing" && (
					<Button onClick={stopPlayback}>Stop</Button>
				)}
				{playbackState === "playing" && (
					<span className="text-green-400 self-center ml-2">▶ Playing</span>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div>
					<h2 className="text-lg font-semibold mb-2">Code</h2>
					<CodeEditor value={code} onChange={setCode} onRun={handleRun} className="h-96" />
				</div>

				<div>
					<h2 className="text-lg font-semibold mb-2">Output</h2>
					{error ? <ErrorDisplay message={error} /> : <Tabs tabs={tabs} />}
				</div>
			</div>

			{result && (
				<div className="mt-4 text-sm text-surface-400">
					Raw: {result.graph.nodes.length} nodes | Expanded: {result.expanded.nodes.length} nodes | Runtime L:{" "}
					{result.runtime.left.nodes.length} R: {result.runtime.right.nodes.length} nodes
				</div>
			)}
		</div>
	);
}
