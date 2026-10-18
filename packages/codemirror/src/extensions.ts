import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching } from "@codemirror/language";
import { EditorState, type Extension } from "@codemirror/state";
import {
	crosshairCursor,
	drawSelection,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	lineNumbers,
	rectangularSelection,
} from "@codemirror/view";
import type { Category } from "auxlang/types";

import { moduleHighlight } from "./module-highlight";

export function createExtensions(categoryColors: Record<Category, string>): Extension[] {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightSpecialChars(),
		drawSelection(),
		rectangularSelection(),
		crosshairCursor(),
		highlightActiveLine(),
		bracketMatching(),
		closeBrackets(),
		autocompletion(),
		javascript({ typescript: true }),
		moduleHighlight(categoryColors),
		EditorState.tabSize.of(2),
	];
}
