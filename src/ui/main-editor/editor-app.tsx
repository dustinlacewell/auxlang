import { PlayableEditor } from "@/ui/code-editor/playable-editor";
import { useEditorState } from "./use-editor-state";

export function EditorApp() {
	const { code, setCode, state, run, stop, graphId } = useEditorState();

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Auxlang</h1>

			<PlayableEditor
				value={code}
				onChange={setCode}
				state={state}
				onPlay={run}
				onStop={stop}
				{...(graphId ? { graphId } : {})}
			/>
		</div>
	);
}
