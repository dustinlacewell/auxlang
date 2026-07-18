/**
 * The core3 editor: the site's main page. Composes the controller hook, the
 * CodeMirror surface, the loud error strip, and the collapsible graph panel —
 * same layout idiom as main-editor (max-w-6xl page, bordered editor frame).
 */

import { CodeMirror } from "./code-mirror";
import { EditorControls } from "./editor-controls";
import { ErrorStrip } from "./error-strip";
import { GraphPanel } from "./graph-panel";
import { useCore3Editor } from "./use-core3-editor";

export function EditorApp() {
	const { code, setCode, program, error, isPlaying, run, halt } = useCore3Editor();

	return (
		<div className="min-h-screen p-5 max-w-6xl mx-auto">
			<h1 className="text-2xl font-bold mb-1">Auxlang</h1>
			<p className="text-sm text-gray-400 mb-1">patterns and signals, one patch</p>
			<p className="text-xs text-gray-500 mb-4">
				<a className="hover:text-white underline" href="/core2.html">
					legacy editor
				</a>
				{" · "}
				<a className="hover:text-white underline" href="/core3.html">
					bare playground
				</a>
			</p>

			<div className="border border-surface-600 rounded overflow-hidden">
				<EditorControls
					isPlaying={isPlaying}
					onRun={() => void run()}
					onStop={halt}
					onPickExample={setCode}
				/>
				<CodeMirror value={code} onChange={setCode} onRun={() => void run()} className="text-xs" />
			</div>

			<ErrorStrip error={error} />
			<GraphPanel program={program} />
		</div>
	);
}
