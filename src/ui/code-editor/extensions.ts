import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching } from "@codemirror/language";
import { type Extension, EditorState } from "@codemirror/state";
import {
	lineNumbers,
	highlightActiveLineGutter,
	highlightActiveLine,
	drawSelection,
	rectangularSelection,
	crosshairCursor,
	highlightSpecialChars,
} from "@codemirror/view";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";

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
		EditorState.tabSize.of(2),
	];
}
