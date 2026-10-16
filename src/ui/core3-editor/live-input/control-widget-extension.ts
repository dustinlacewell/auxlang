/**
 * Control widgets (MANIFESTO §5.3/§8, `control-modules`): one inline
 * CodeMirror widget after each control call (slider, knob, toggle, button,
 * xy), joined to its live slot(s) by `control-sites.ts`. Widgets show as soon
 * as the code is in the editor: `slotsOf()` is the preview eval's live slots
 * while stopped, or the playing program's (`currentSlots()`) while playing —
 * either way just display data (value, range).
 *
 * Moving a widget always rewrites its value literal in the code — when the
 * call wrote one (`xy(0.2, 0.4)`); a value bound to a signal has nothing to
 * rewrite. While playing, it ALSO writes the engine's slot (already coalesced
 * to one message per frame in runtime/audio.ts): that slot index is
 * re-resolved against `currentSlots()` by site (`slotIndexForSite`) at write
 * time, never reused from `slotsOf()` — a stopped preview eval's slot order
 * can differ from the playing program's. The doc edit is batched to one
 * transaction per frame (frame-coalescer.ts, used here only for the doc edit)
 * and annotated `dragEditAnnotation` so the host skips re-evaluating for it.
 *
 * A literal's range is seeded from `sourceMap` on each re-eval, then
 * remapped through every doc change after that (same approach as the glow
 * and pattern-highlight extensions' decorations), so a widget write still
 * finds the right text after an earlier edit has shifted it. Widget DOM is
 * built once per control and reused across updates (`eq`/`updateDOM`).
 */

import { currentSlots, writeSlot } from "@/core3/runtime/audio";
import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import type { SourceMap } from "@/core3/source/source-map";
import type { Extension } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { controlWidgetsOf, slotIndexForSite, type ControlWidget } from "./control-sites";
import { FrameCoalescer } from "./frame-coalescer";
import { literalRewrite } from "./literal-rewrite";
import { dragEditAnnotation } from "./number-drag-extension";
import { renderControl } from "./render-control";

interface LiveRange {
	start: number;
	end: number;
}

export interface ControlWidgetHost {
	/** Reads the mounted editor's latest sourceMap (rebuilt on every `run()` and every preview eval). */
	readonly sourceMapOf: () => SourceMap;
	/** Display slots for the widgets: the preview eval's while stopped, the playing program's while playing. */
	readonly slotsOf: () => readonly SlotDecl[];
	/** True while a program is actually playing — gates whether a move also writes the engine's slot. */
	readonly isPlaying: () => boolean;
}

export function controlWidgetExtension(host: ControlWidgetHost): Extension {
	const { sourceMapOf, slotsOf, isPlaying } = host;
	const plugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet = Decoration.none;
			/** Literal arg site -> its live range, remapped through every doc change since the last re-eval. */
			private literalRanges = new Map<number, LiveRange>();
			private lastSourceMap: SourceMap | null = null;

			constructor(private view: EditorView) {
				this.rebuild();
			}

			update(update: ViewUpdate) {
				if (update.docChanged) {
					for (const range of this.literalRanges.values()) {
						range.start = update.changes.mapPos(range.start);
						range.end = update.changes.mapPos(range.end, 1);
					}
				}
				this.rebuild();
			}

			private rebuild() {
				const sourceMap = sourceMapOf();
				if (sourceMap !== this.lastSourceMap) {
					this.lastSourceMap = sourceMap;
					this.literalRanges = seedLiteralRanges(sourceMap);
				}
				const widgets = controlWidgetsOf(sourceMap, slotsOf());
				this.decorations = Decoration.set(
					widgets
						.map((widget) =>
							Decoration.widget({
								widget: new ControlWidgetType(
									widget,
									this.literalRanges,
									isPlaying,
									(site, value) => this.writeLiteral(site, value),
								),
								side: 1,
							}).range(widget.call.range.end),
						)
						.sort((a, b) => a.from - b.from),
				);
			}

			private writeLiteral(site: number, value: number) {
				const range = this.literalRanges.get(site);
				if (range === undefined) return;
				const docText = this.view.state.doc.toString();
				const change = literalRewrite(docText, range, value);
				this.view.dispatch({ changes: change, annotations: dragEditAnnotation.of(true) });
				range.end = range.start + change.insert.length;
			}
		},
		{ decorations: (v) => v.decorations },
	);
	return [plugin, controlTheme];
}

const controlTheme = EditorView.baseTheme({
	".aux-control": {
		display: "inline-block",
		verticalAlign: "middle",
		margin: "0 4px",
		cursor: "pointer",
		userSelect: "none",
		touchAction: "none",
		position: "relative",
	},
	".aux-control-slider": {
		width: "10px",
		height: "48px",
		background: "rgba(255,255,255,0.08)",
		borderRadius: "4px",
	},
	".aux-control-track": {
		width: "100%",
		height: "100%",
		background: "rgba(96, 165, 250, 0.4)",
		borderRadius: "4px",
	},
	".aux-control-knob": {
		width: "16px",
		height: "16px",
		borderRadius: "50%",
		background: "rgba(96, 165, 250, 0.5)",
		border: "1px solid rgba(96, 165, 250, 0.9)",
	},
	".aux-control-knob-pointer": {
		position: "absolute",
		left: "50%",
		top: "50%",
		width: "1px",
		height: "7px",
		background: "white",
		// Rotate about the line's bottom end, which sits on the knob's centre.
		transformOrigin: "50% 100%",
		// knobAngle() is 0 = pointing up: the line spans centre to rim above it.
		translate: "0 -7px",
	},
	".aux-control-toggle": {
		width: "22px",
		height: "12px",
		borderRadius: "6px",
		background: "rgba(255,255,255,0.15)",
	},
	".aux-control-on": {
		background: "rgba(74, 222, 128, 0.6)",
	},
	".aux-control-button": {
		width: "16px",
		height: "16px",
		borderRadius: "3px",
		background: "rgba(255,255,255,0.15)",
	},
	".aux-control-pressed": {
		background: "rgba(250, 204, 21, 0.6)",
	},
	".aux-control-xy": {
		width: "40px",
		height: "40px",
		borderRadius: "4px",
		background: "rgba(255,255,255,0.08)",
	},
	".aux-control-xy-puck": {
		position: "absolute",
		width: "6px",
		height: "6px",
		borderRadius: "50%",
		background: "rgba(250, 204, 21, 0.9)",
		transform: "translate(-50%, -50%)",
	},
});

function seedLiteralRanges(sourceMap: SourceMap): Map<number, LiveRange> {
	const ranges = new Map<number, LiveRange>();
	for (const site of sourceMap.sites) {
		if (site.kind === "number") ranges.set(site.id, { start: site.range.start, end: site.range.end });
	}
	return ranges;
}

export class ControlWidgetType extends WidgetType {
	constructor(
		private readonly widget: ControlWidget,
		private readonly literalRanges: ReadonlyMap<number, LiveRange>,
		private readonly isPlaying: () => boolean,
		private readonly onWrite: (literalSite: number, value: number) => void,
	) {
		super();
	}

	/** Same control site: the DOM survives (no recreate) across a decoration rebuild. */
	override eq(other: ControlWidgetType): boolean {
		return other.widget.kind === this.widget.kind && other.widget.call.id === this.widget.call.id;
	}

	/** A value change alone (slot init moved under an unchanged site) never forces a redraw either. */
	override updateDOM(): boolean {
		return true;
	}

	override toDOM(): HTMLElement {
		const coalescer = new FrameCoalescer((writes) => {
			for (const [slotIndex, value] of writes) {
				const slot = this.widget.slots.find((s) => s.slotIndex === slotIndex);
				if (this.isPlaying() && slot !== undefined) {
					const engineIndex = slotIndexForSite(currentSlots(), slot.decl.site);
					if (engineIndex !== null) writeSlot(engineIndex, value);
				}
				const literal = slot?.literal;
				if (literal !== null && literal !== undefined && "site" in literal) {
					this.onWrite(literal.site, value);
				}
			}
		});
		return renderControl(this.widget, (slotIndex, value) => coalescer.push(slotIndex, value));
	}
}
