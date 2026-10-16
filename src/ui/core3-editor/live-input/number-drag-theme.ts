/**
 * CSS for a live number drag (number-drag-extension.ts): while `view.dom`
 * carries `.aux-number-dragging`, text selection and touch scrolling are
 * suppressed so the drag gesture reads as a drag, not a text select.
 */

import { EditorView } from "@codemirror/view";

export const numberDragTheme = EditorView.baseTheme({
	"&.aux-number-dragging, &.aux-number-dragging *": {
		userSelect: "none",
		touchAction: "none",
	},
});
