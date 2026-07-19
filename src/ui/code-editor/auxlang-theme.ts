import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { oneDarkTheme } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

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

/**
 * The ONE syntax-highlight style for auxlang editors — a fork of
 * oneDarkHighlightStyle with our identifier treatment baked in, used INSTEAD of
 * oneDark's own style (we import only oneDarkTheme, the chrome). Layering a
 * second syntaxHighlighting() over oneDark's doesn't work: both styles tag the
 * same span with equal-specificity classes and stylesheet injection order picks
 * the winner arbitrarily. Single owner, no cascade race.
 *
 * Departures from oneDark: variables are pure white; property access — port
 * reads (`s.gate`), method chains, object keys (`{ cutoff: 900 }`) — is a quiet
 * gray, so the only strong color in code is a registered module name in its
 * category color (the `aux-mod-*` decorations, which out-rank this via
 * `!important` + descendant selectors). Grays are literal hexes on purpose —
 * not palette imports, since they carry no unit/category meaning.
 */
const white = "#ffffff";
const quiet = "#8a93a3";
const auxSyntax = HighlightStyle.define([
	{ tag: t.keyword, color: "#c678dd" },
	{ tag: [t.deleted, t.character, t.macroName], color: "#e06c75" },
	{ tag: [t.variableName, t.definition(t.variableName)], color: white },
	// Non-module function calls; registered modules get aux-mod colors on top.
	{ tag: [t.function(t.variableName), t.labelName], color: "#61afef" },
	{ tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#d19a66" },
	{ tag: [t.definition(t.name), t.separator], color: "#abb2bf" },
	{
		tag: [t.propertyName, t.function(t.propertyName), t.definition(t.propertyName)],
		color: quiet,
	},
	{
		tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
		color: "#e5c07b",
	},
	{
		tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
		color: "#56b6c2",
	},
	{ tag: [t.meta, t.comment], color: "#7d8799" },
	{ tag: t.strong, fontWeight: "bold" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.strikethrough, textDecoration: "line-through" },
	{ tag: t.link, color: "#7d8799", textDecoration: "underline" },
	{ tag: t.heading, fontWeight: "bold", color: "#e06c75" },
	{ tag: [t.atom, t.bool, t.special(t.variableName)], color: "#d19a66" },
	{ tag: [t.processingInstruction, t.string, t.inserted], color: "#98c379" },
	{ tag: t.invalid, color: white },
]);

export const auxlangTheme = [oneDarkTheme, syntaxHighlighting(auxSyntax), visualizationStyles];
