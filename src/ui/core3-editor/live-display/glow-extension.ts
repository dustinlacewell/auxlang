/**
 * LED glow behind each watched module call (MANIFESTO §10.2): a ViewPlugin
 * that subscribes to the shared monitor tick (live-monitor-loop.ts) while
 * mounted, and marks each watch's call-site text with a brightness/sign/flash
 * decoration. Quantized to QUANTUM_STEPS steps so a decoration set is only
 * rebuilt when a watch's step actually changes — most frames touch nothing.
 * Background only: glow is a CSS custom property on a mark's class, never an
 * inline style on the mark's own color, so a syntax-highlighted token nested
 * inside keeps its own text color (module-highlight.ts's same convention).
 */

import { getRegistry } from "@/core3/module/define";
import type { SourceMap } from "@/core3/source/source-map";
import type { Extension } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";
import { classifyOutput } from "./classify-output";
import { MAX_ALPHA, MAX_ALPHA_AUDIO, glowAlpha, glowMarkClass } from "./glow-alpha";
import { type GlowState, type OutputKind, createGlowState, glowOf } from "./glow-state";
import { watchMonitor } from "./live-monitor-loop";
import { buildSiteRanges } from "./site-ranges";

const QUANTUM_STEPS = 16;
/** No frame in this long: the glow reads as stopped and clears (item 1 of the live-controls fixes). */
const STALE_MS = 250;
const reducedMotion = () =>
	typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `sourceMapOf()` reads the mounted editor's latest sourceMap (rebuilt on every `run()`). */
export function glowExtension(sourceMapOf: () => SourceMap): Extension {
	const registry = getRegistry();
	const plugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet = Decoration.none;
			private states = new Map<number, GlowState>();
			private steps = new Map<number, number>();
			private unsubscribe: () => void;
			private staleTimer: ReturnType<typeof setTimeout> | null = null;

			constructor(private view: EditorView) {
				this.unsubscribe = watchMonitor((snapshot, watches) => {
					const sourceMap = sourceMapOf();
					const siteRanges = buildSiteRanges(sourceMap);
					const now = performance.now();
					let changed = false;
					const marks: {
						from: number;
						to: number;
						step: number;
						sign: -1 | 0 | 1;
						kind: OutputKind;
					}[] = [];

					watches.forEach((watch, i) => {
						const levels = snapshot.levels[i];
						const range = siteRanges.rangeOf(watch.site);
						if (levels === undefined || range === undefined) return;
						const spec = registry.get(watch.module);
						if (spec === undefined) return;
						const kind = classifyOutput(spec, watch.port);
						const state = this.states.get(i) ?? createGlowState();
						this.states.set(i, state);
						const glow = glowOf(levels, kind, state, now, reducedMotion());
						const step = Math.round(glow.intensity * QUANTUM_STEPS);
						if (this.steps.get(i) !== step) changed = true;
						this.steps.set(i, step);
						if (step > 0) marks.push({ from: range.start, to: range.end, step, sign: glow.sign, kind });
					});

					if (changed) this.decorations = buildDecorations(marks);
					this.armStaleTimer();
				});
			}

			update(update: ViewUpdate) {
				if (update.docChanged) this.decorations = this.decorations.map(update.changes);
			}

			destroy() {
				this.clearStaleTimer();
				this.unsubscribe();
				this.decorations = Decoration.none;
			}

			/** No frame for STALE_MS: the monitor read as stopped, so the glow clears. */
			private armStaleTimer() {
				this.clearStaleTimer();
				this.staleTimer = setTimeout(() => {
					this.decorations = Decoration.none;
					this.states.clear();
					this.steps.clear();
					this.view.dispatch({});
				}, STALE_MS);
			}

			private clearStaleTimer() {
				if (this.staleTimer === null) return;
				clearTimeout(this.staleTimer);
				this.staleTimer = null;
			}
		},
		{ decorations: (v) => v.decorations },
	);

	return [plugin, glowTheme];
}

function buildDecorations(
	marks: readonly { from: number; to: number; step: number; sign: -1 | 0 | 1; kind: OutputKind }[],
): DecorationSet {
	const sorted = [...marks].sort((a, b) => a.from - b.from);
	return Decoration.set(
		sorted.map((m) =>
			Decoration.mark({ class: glowMarkClass(m.step, m.kind, m.sign) }).range(m.from, m.to),
		),
	);
}

const glowTheme = EditorView.baseTheme(
	Object.fromEntries(
		Array.from({ length: QUANTUM_STEPS + 1 }, (_, step) => {
			const alpha = glowAlpha(step, QUANTUM_STEPS, "bipolar");
			return [`.aux-glow-${step}`, { backgroundColor: `rgba(250, 204, 21, ${alpha.toFixed(3)})` }];
		})
			.concat(
				Array.from({ length: QUANTUM_STEPS + 1 }, (_, step) => {
					const alpha = glowAlpha(step, QUANTUM_STEPS, "audio");
					return [`.aux-glow-audio-${step}`, { backgroundColor: `rgba(250, 204, 21, ${alpha.toFixed(3)})` }];
				}),
			)
			.concat([
				[".aux-glow-pos", { backgroundColor: `var(--aux-glow-pos, rgba(74, 222, 128, ${MAX_ALPHA}))` }],
				[".aux-glow-neg", { backgroundColor: `var(--aux-glow-neg, rgba(248, 113, 113, ${MAX_ALPHA}))` }],
			]),
	),
);
