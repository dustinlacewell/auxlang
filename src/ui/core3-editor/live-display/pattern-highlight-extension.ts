/**
 * Live pattern highlight (MANIFESTO §10.2/§10.3): a ViewPlugin that
 * subscribes to the shared monitor tick (live-monitor-loop.ts) and lights the
 * mini-notation token a seq is currently sounding, timed to `audibleFrame()`
 * (runtime/audio.ts) so the light matches the sound leaving the speakers.
 * Decorations rebuild only when the lit set actually changes.
 */

import { audibleFrame } from "@/core3/runtime/audio";
import type { SourceMap } from "@/core3/source/source-map";
import { type Extension, StateEffect } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import { watchMonitor } from "./live-monitor-loop";
import { heldOnsets } from "./held-onsets";
import { type Onset, onsetsToLights } from "./onsets-to-lights";
import { buildSiteRanges } from "./site-ranges";

const litMark = Decoration.mark({ class: "aux-pattern-lit" });

/** An empty transaction's tag: the lit set changed, so the view redraws the plugin's decorations. */
const lightsChanged = StateEffect.define<null>();

/** `sourceMapOf()` reads the mounted editor's latest sourceMap (rebuilt on every `run()`). */
export function patternHighlightExtension(sourceMapOf: () => SourceMap): Extension {
	const plugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet = Decoration.none;
			private lastLit: ReadonlySet<number> = new Set();
			/** Onsets carried across frames until audible (held-onsets.ts); site ids belong to `heldFor`. */
			private held: Onset[] = [];
			private heldFor: SourceMap | null = null;
			private unsubscribe: () => void;

			constructor(private view: EditorView) {
				this.unsubscribe = watchMonitor((snapshot) => {
					const sourceMap = sourceMapOf();
					if (sourceMap !== this.heldFor) {
						this.held = [];
						this.heldFor = sourceMap;
					}
					const now = audibleFrame();
					this.held = heldOnsets(this.held, snapshot.onsets, now);
					const siteRanges = buildSiteRanges(sourceMap);
					const lit = onsetsToLights(this.held, siteRanges, now, performance.now());
					if (setsEqual(lit, this.lastLit)) return;
					this.lastLit = lit;
					this.decorations = Decoration.set(
						[...lit]
							.map((site) => siteRanges.rangeOf(site))
							.filter((range): range is NonNullable<typeof range> => range !== undefined)
							.sort((a, b) => a.start - b.start)
							.map((range) => litMark.range(range.start, range.end)),
					);
					// CodeMirror reads a plugin's decorations only during a view
					// update: this tick runs outside one, so ask for one.
					this.view.dispatch({ effects: lightsChanged.of(null) });
				});
			}

			update(update: ViewUpdate) {
				if (update.docChanged) this.decorations = this.decorations.map(update.changes);
			}

			destroy() {
				this.unsubscribe();
			}
		},
		{ decorations: (v) => v.decorations },
	);

	return [plugin, patternHighlightTheme];
}

function setsEqual(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
	if (a.size !== b.size) return false;
	for (const x of a) if (!b.has(x)) return false;
	return true;
}

const patternHighlightTheme = EditorView.baseTheme({
	".aux-pattern-lit": { backgroundColor: "rgba(96, 165, 250, 0.35)", borderRadius: "2px" },
});
