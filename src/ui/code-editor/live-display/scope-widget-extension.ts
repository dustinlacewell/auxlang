/**
 * Live scope widgets: one inline canvas per `scope()` call site, drawing its
 * latest sweep (draw-wave.ts) at animation-frame rate while the monitor runs,
 * each trace against a range that holds steady between frames
 * (scope-scale.ts). Subscribes to `onMonitor` directly (not the
 * shared pattern-highlight loop: that one only carries onsets, not display
 * buffers) — one listener for the plugin's life, unsubscribed on destroy.
 *
 * Decorations rebuild only when the set of displayed call sites changes
 * (a scope added/removed, or play stopped and the widgets are dropped); the
 * canvas itself is redrawn every rAF tick without touching CodeMirror state,
 * same split as the control widgets' drag vs. decoration rebuild.
 */

import { onMonitor } from "@/core3/runtime/audio";
import type { DisplayWatch, MonitorFrame } from "@/core3/runtime/live/live-contract";
import type { CallSite, SourceMap } from "@/core3/source/source-map";
import { type Extension, StateEffect } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { readDisplays } from "./display-frames";
import { drawWave } from "./draw-wave";
import { fixedRange, nextRange } from "./scope-scale";
import { type Range, traceIsSilent, traceRange } from "./trace-stats";

const TRACES = 8;

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 36;

/** An empty transaction's tag: the displayed site set changed, so the view redraws. */
const displaysChanged = StateEffect.define<null>();

export function scopeWidgetExtension(sourceMapOf: () => SourceMap): Extension {
	const plugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet = Decoration.none;
			private lanesBySite = new Map<number, Float64Array[]>();
			private canvasBySite = new Map<number, HTMLCanvasElement>();
			private displays: readonly DisplayWatch[] = [];
			private sites: ReadonlySet<number> = new Set();
			private rangesBySite = new Map<number, (Range | undefined)[]>();
			private lastTick: number | null = null;
			private rafId: number | null = null;
			private unsubscribe: () => void;

			constructor(private view: EditorView) {
				this.unsubscribe = onMonitor((frame: MonitorFrame, _watches, displays) => {
					readDisplays(
						new Float64Array(frame.buffer),
						frame.levelCount,
						displays,
						this.lanesBySite,
					);
					this.displays = displays;
					this.rafId ??= requestAnimationFrame((now) => this.tick(now));
				});
			}

			update(update: ViewUpdate) {
				if (update.docChanged) this.decorations = this.decorations.map(update.changes);
			}

			destroy() {
				this.unsubscribe();
				if (this.rafId !== null) cancelAnimationFrame(this.rafId);
			}

			private tick(now: number) {
				this.rafId = null;
				const nextSites = new Set(this.displays.map((d) => d.site));
				if (!setsEqual(nextSites, this.sites)) {
					this.sites = nextSites;
					this.rebuild();
				}
				const dtSecs = this.lastTick === null ? 0 : (now - this.lastTick) / 1000;
				this.lastTick = now;
				for (const display of this.displays) {
					const canvas = this.canvasBySite.get(display.site);
					const lanes = this.lanesBySite.get(display.site);
					if (canvas === undefined || lanes === undefined) continue;
					const traces = drawnTraces(lanes);
					const ranges = this.rangesBySite.get(display.site) ?? [];
					const fixed = fixedRange(display.config);
					for (const t of traces)
						ranges[t] = nextRange(ranges[t], traceRange(lanes, t), fixed, dtSecs);
					this.rangesBySite.set(display.site, ranges);
					drawWave(canvas, lanes, traces, ranges);
				}
			}

			private rebuild() {
				const sourceMap = sourceMapOf();
				const calls = callSitesById(sourceMap);
				const widgets = this.displays
					.map((display) => {
						const call = calls.get(display.site);
						if (call === undefined) return null;
						return { display, call };
					})
					.filter((w): w is { display: DisplayWatch; call: CallSite } => w !== null)
					.sort((a, b) => a.call.range.end - b.call.range.end);

				this.decorations = Decoration.set(
					widgets.map(({ display, call }) =>
						Decoration.widget({
							widget: new ScopeWidgetType(display, this.canvasBySite),
							side: 1,
						}).range(call.range.end),
					),
				);
				this.view.dispatch({ effects: displaysChanged.of(null) });
			}
		},
		{ decorations: (v) => v.decorations },
	);
	return [plugin, scopeTheme];
}

function callSitesById(sourceMap: SourceMap): Map<number, CallSite> {
	const calls = new Map<number, CallSite>();
	for (const site of sourceMap.sites) if (site.kind === "call") calls.set(site.id, site);
	return calls;
}

/** The traces some lane uses (not all zeros); trace 0 when none does. */
function drawnTraces(lanes: readonly Float64Array[]): number[] {
	const traces: number[] = [];
	for (let t = 0; t < TRACES; t++) {
		if (lanes.some((words) => !traceIsSilent(words, t))) traces.push(t);
	}
	return traces.length > 0 ? traces : [0];
}

function setsEqual(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
	if (a.size !== b.size) return false;
	for (const x of a) if (!b.has(x)) return false;
	return true;
}

class ScopeWidgetType extends WidgetType {
	constructor(
		private readonly display: DisplayWatch,
		private readonly canvasBySite: Map<number, HTMLCanvasElement>,
	) {
		super();
	}

	override eq(other: ScopeWidgetType): boolean {
		return (
			other.display.site === this.display.site &&
			other.display.config.width === this.display.config.width &&
			other.display.config.height === this.display.config.height
		);
	}

	override toDOM(): HTMLElement {
		const config = this.display.config;
		const width = typeof config.width === "number" ? config.width : DEFAULT_WIDTH;
		const height = typeof config.height === "number" ? config.height : DEFAULT_HEIGHT;
		const canvas = document.createElement("canvas");
		canvas.className = "aux-scope";
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		this.canvasBySite.set(this.display.site, canvas);
		return canvas;
	}

	override destroy(dom: HTMLElement): void {
		if (this.canvasBySite.get(this.display.site) === dom)
			this.canvasBySite.delete(this.display.site);
	}
}

const scopeTheme = EditorView.baseTheme({
	".aux-scope": {
		display: "inline-block",
		verticalAlign: "middle",
		margin: "0 4px",
		background: "rgba(255,255,255,0.08)",
		borderRadius: "4px",
	},
});
