import { useMemo, useState } from "react";
import { graphToDot, stereoGraphToDot } from "@/core2/viz/graph-to-dot";
import { PlayableEditor } from "@/ui/code-editor/playable-editor";
import { GraphViewer, type Transform } from "@/ui/core2-editor/graph-viewer";
import { useEditorState } from "./use-editor-state";

export function EditorApp() {
	const { code, setCode, state, run, stop, graphId, error, preGraph, stereoGraph } = useEditorState();
	const [activeTab, setActiveTab] = useState<"raw-graph" | "expanded-graph" | "raw-json" | "expanded-json">(
		"raw-graph",
	);
	const [sharedTransform, setSharedTransform] = useState<Transform | undefined>(undefined);
	const [sharedShowOrphaned, setSharedShowOrphaned] = useState(false);

	const rawDot = useMemo(() => (preGraph ? graphToDot(preGraph) : null), [preGraph]);
	const expandedDot = useMemo(() => (stereoGraph ? stereoGraphToDot(stereoGraph) : null), [stereoGraph]);

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Auxlang</h1>

			<PlayableEditor
				value={code}
				onChange={setCode}
				state={state}
				onPlay={run}
				onStop={stop}
				error={error}
				{...(graphId ? { graphId } : {})}
			/>

			<div className="mt-6 border border-surface-600 rounded overflow-hidden">
				<div className="flex bg-surface-700 border-b border-surface-600 h-10">
					{[
						{ id: "raw-graph", label: "Raw Graph" },
						{ id: "expanded-graph", label: "Expanded Graph" },
						{ id: "raw-json", label: "Raw JSON" },
						{ id: "expanded-json", label: "Expanded JSON" },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id as typeof activeTab)}
							className={`px-4 text-sm transition-colors ${
								activeTab === tab.id
									? "bg-surface-800 text-white"
									: "text-gray-400 hover:text-white hover:bg-surface-600"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="h-80 bg-surface-900 relative">
					<div className={activeTab === "raw-graph" ? "h-full" : "hidden"}>
						<GraphViewer
							dot={rawDot}
							className="h-full"
							transform={sharedTransform}
							onTransformChange={setSharedTransform}
							showOrphaned={sharedShowOrphaned}
							onShowOrphanedChange={setSharedShowOrphaned}
						/>
					</div>
					<div className={activeTab === "expanded-graph" ? "h-full" : "hidden"}>
						<GraphViewer
							dot={expandedDot}
							className="h-full"
							transform={sharedTransform}
							onTransformChange={setSharedTransform}
							showOrphaned={sharedShowOrphaned}
							onShowOrphanedChange={setSharedShowOrphaned}
						/>
					</div>
					{activeTab === "raw-json" && (
						<pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto h-full">
							{preGraph ? JSON.stringify(preGraph, null, 2) : "Run code to view graph"}
						</pre>
					)}
					{activeTab === "expanded-json" && (
						<pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap overflow-auto h-full">
							{stereoGraph ? JSON.stringify(stereoGraph, null, 2) : "Run code to view graph"}
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}
