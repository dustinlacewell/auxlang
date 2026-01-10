import { CodeEditor } from "@/ui/code-editor/code-editor";
import { ErrorDisplay } from "@/ui/design/error-display";
import { EditorControls } from "./editor-controls";
import { useEditorState } from "./use-editor-state";

export function EditorApp() {
	const { code, setCode, state, error, run, stop } = useEditorState();

	return (
		<div className="min-h-screen p-5 max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Auxlang</h1>

			<div className="mb-4">
				<EditorControls onRun={run} onStop={stop} isPlaying={state === "playing"} />
			</div>

			<CodeEditor value={code} onChange={setCode} onRun={run} className="mb-4" />

			{error && <ErrorDisplay message={error} />}
		</div>
	);
}
