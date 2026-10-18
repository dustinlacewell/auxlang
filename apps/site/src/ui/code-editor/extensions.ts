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

import { moduleHighlight } from "./module-highlight";

export function createExtensions(): Extension[] {
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
		moduleHighlight,
		EditorState.tabSize.of(2),
	];
}
