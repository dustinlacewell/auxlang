/**
 * Category-colored module names in the editor: every registered module name,
 * when called (`sin(`, `.lpf(`), takes its category's saturated color — the
 * same convention as graph nodes, badges, and card titles. Built from the LIVE
 * registry so new modules highlight without touching this file; colors come
 * only from src/theme/colors.ts, keyed by Category.
 *
 * Styling is a theme rule targeting the mark's class AND its descendants —
 * CodeMirror nests syntax-highlight spans inside mark-decoration spans, and a
 * nested span's own token color beats any parent inline style, so an inline
 * `style` attribute here silently loses to oneDark.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import type { Category } from "@/core3/types";
import { categoryColors } from "@/theme/colors";
import type { Extension } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	MatchDecorator,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";

const registry = getRegistry();

const markFor = new Map<Category, Decoration>(
	(Object.keys(categoryColors) as Category[]).map((cat) => [
		cat,
		Decoration.mark({ class: `aux-mod aux-mod-${cat}` }),
	]),
);

/** One rule per category, covering the mark span and any nested token spans. */
const categoryTheme = EditorView.baseTheme(
	Object.fromEntries(
		(Object.entries(categoryColors) as [Category, string][]).flatMap(([cat, color]) => [
			[`.aux-mod-${cat}, .aux-mod-${cat} span`, { color: `${color} !important`, fontWeight: "600" }],
		]),
	),
);

// Longest-first so overlapping prefixes resolve to the full name.
const names = [...registry.keys()].sort((a, b) => b.length - a.length);
const callPattern = new RegExp(`\\b(${names.join("|")})(?=\\s*\\()`, "g");

const decorator = new MatchDecorator({
	regexp: callPattern,
	decoration: (match) => {
		const spec = match[1] !== undefined ? registry.get(match[1]) : undefined;
		return spec ? (markFor.get(spec.category) ?? null) : null;
	},
});

const highlightPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = decorator.createDeco(view);
		}
		update(update: ViewUpdate) {
			this.decorations = decorator.updateDeco(update, this.decorations);
		}
	},
	{ decorations: (v) => v.decorations },
);

export const moduleHighlight: Extension = [highlightPlugin, categoryTheme];

/**
 * Ctrl/Cmd + hover over a decorated module-name call surfaces that module's
 * card. This is a plain DOM attachment (not a CM StateField) so the wrapping
 * React component can render the popover through a portal, matching how
 * ModuleName does it. Reuses the same `callPattern` regex the decorator uses,
 * so "what counts as a module name" can never drift between highlight and hover.
 */
export function attachModuleHover(
	view: EditorView,
	onHover: (info: { name: string; x: number; y: number } | null) => void,
): () => void {
	const moduleAt = (x: number, y: number): string | null => {
		const pos = view.posAtCoords({ x, y });
		if (pos === null) return null;
		const line = view.state.doc.lineAt(pos);
		callPattern.lastIndex = 0;
		for (let m = callPattern.exec(line.text); m !== null; m = callPattern.exec(line.text)) {
			const from = line.from + m.index;
			const to = from + m[0].length;
			if (pos >= from && pos <= to && m[1] !== undefined && registry.has(m[1])) return m[1];
		}
		return null;
	};

	const onMove = (event: MouseEvent) => {
		if (!(event.ctrlKey || event.metaKey)) return onHover(null);
		const name = moduleAt(event.clientX, event.clientY);
		onHover(name ? { name, x: event.clientX, y: event.clientY } : null);
	};

	const onKeyUp = (event: KeyboardEvent) => {
		if (event.key === "Control" || event.key === "Meta") onHover(null);
	};

	view.dom.addEventListener("mousemove", onMove);
	window.addEventListener("keyup", onKeyUp);
	return () => {
		view.dom.removeEventListener("mousemove", onMove);
		window.removeEventListener("keyup", onKeyUp);
	};
}
