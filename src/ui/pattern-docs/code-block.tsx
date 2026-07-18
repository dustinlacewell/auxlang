/**
 * Read-only code display for a doc example. Reuses the app's CodeMirror stack
 * (auxlang theme + the shared extensions) so patches look identical to the
 * playground/editor, just non-editable — these are docs, not an editor.
 */

import { auxlangTheme } from "@/ui/code-editor/auxlang-theme";
import { createExtensions } from "@/ui/code-editor/extensions";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

interface CodeBlockProps {
	code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const state = EditorState.create({
			doc: code,
			extensions: [...createExtensions(), auxlangTheme, EditorState.readOnly.of(true)],
		});
		const view = new EditorView({ state, parent: containerRef.current });
		return () => view.destroy();
	}, [code]);

	return <div ref={containerRef} className="border border-surface-700 rounded overflow-auto mb-2" />;
}
