import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

const visualizationStyles = EditorView.theme({
	".device-active": {
		backgroundColor: "rgba(100, 200, 255, calc(var(--intensity, 0) * 0.3))",
		boxShadow: "0 0 calc(var(--intensity, 0) * 8px) rgba(100, 200, 255, calc(var(--intensity, 0) * 0.5))",
		borderBottom: "1px solid rgba(100, 200, 255, calc(var(--intensity, 0) * 0.5))",
		transition: "background-color 100ms ease-out, box-shadow 100ms ease-out",
	},
	".seq-note": {
//		padding: "2px 4px",
	},
	".seq-note-active": {
		backgroundColor: "#64ff9644 !important",
		outline: "1px solid #64ff9688 !important",
		outlineOffset: "1px !important",
		color: "#ebefecff !important",
	},
	".seq-note-active span": {
		backgroundColor: "transparent !important",
		color: "#cdeb63ff !important",
	},
	".seq-modifier-active": {
		backgroundColor: "#ff964444 !important",
		outline: "1px solid #ff964488 !important",
		outlineOffset: "1px !important",
		color: "#ffcc88ff !important",
	},
	".seq-container-active": {
		borderBottom: "1px solid #8888ff44",
	},
}, { dark: true });

export const auxlangTheme = [oneDark, visualizationStyles];
