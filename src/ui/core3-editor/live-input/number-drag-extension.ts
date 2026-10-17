/**
 * Drag any number (MANIFESTO §5.3, `drag-any-number`): a press on a numeric
 * literal arms a drag, which starts once the pointer moves DRAG_THRESHOLD
 * pixels vertically; a press that never moves that far is a plain click,
 * placing the caret. The grabbed digit sets the step size
 * (step-from-digit.ts); Shift is finer. The first drag of a literal turns it
 * into a live slot (`ensureSlotSite`, a re-eval with that site added) — later
 * drags just `writeSlot` (already coalesced to one message per frame in
 * runtime/audio.ts) and rewrite the literal's text in the doc, batched to one
 * transaction per frame (frame-coalescer.ts, used here only for the doc
 * edit). Esc cancels back to the value the drag started from. The doc edit
 * is annotated `dragEditAnnotation` so the host's change listener can skip
 * re-evaluating for it.
 *
 * The arming press is caught in CodeMirror's own `mousedown` handler
 * (`domEventHandlers`), ahead of CodeMirror's built-in selection drag: a
 * plain left press (no modifier, not a multi-click) on a number returns
 * `true` and calls `preventDefault`, so CodeMirror never starts its own
 * mouse-selection for that press — there is then no race to lose, and no
 * selection to restore. A plain click (no drag) places the caret itself on
 * release.
 *
 * PIXELS_PER_STEP: vertical pixels of drag per one unscaled step; the
 * grabbed digit's place value (step-from-digit.ts) then scales that step
 * into the literal's own magnitude. A plain literal carries no port unit
 * (bind-slots.ts: a dragged number's slot has no range), so it shapes
 * through `shapeByUnit`'s plain-additive case.
 */

import { currentSlots, writeSlot } from "@/core3/runtime/audio";
import type { SourceMap } from "@/core3/source/source-map";
import { Annotation, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { numberDragTheme } from "./number-drag-theme";
import { FrameCoalescer } from "./frame-coalescer";
import { literalRewrite } from "./literal-rewrite";
import { draggableNumbersOf, numberSiteAt } from "./number-drag-sites";
import { shapeByUnit } from "./shape-by-unit";
import { stepFromDigit } from "./step-from-digit";

const PIXELS_PER_STEP = 6;
/** Vertical pixels a press must move before it becomes a drag; less is a plain click. */
const DRAG_THRESHOLD = 3;

/** Marks a transaction as a drag's own doc edit, so the host's change listener can ignore it. */
export const dragEditAnnotation = Annotation.define<boolean>();

export interface NumberDragHost {
	readonly sourceMapOf: () => SourceMap;
	/** Turns a literal's site into a live slot (a re-eval with it added to slotSites); resolves once `currentSlots()` reflects it. */
	readonly ensureSlotSite: (site: number) => Promise<void>;
}

/** Class on `view.dom` while a drag is live: suppresses text selection and touch scroll. */
const DRAGGING_CLASS = "aux-number-dragging";

export function numberDragExtension(host: NumberDragHost): Extension {
	/** One instance per EditorView; the `mousedown` domEventHandler looks itself up here. */
	const instances = new WeakMap<EditorView, { onMouseDown: (event: MouseEvent) => boolean }>();

	const plugin = ViewPlugin.fromClass(
		class {
			private coalescer = new FrameCoalescer((writes) => this.applyWrites(writes));
			private dragging: {
				site: number;
				slotIndex: number;
				range: { start: number; end: number };
				digitStep: number;
				startY: number;
				startValue: number;
			} | null = null;
			/** A press on a number that has not yet moved far enough to be a drag. */
			private armed: {
				number: NonNullable<ReturnType<typeof numberSiteAt>>;
				digitStep: number;
				startY: number;
				pos: number;
			} | null = null;
			/** Counts presses and releases, so a drag whose slot arrives after release never begins. */
			private press = 0;

			constructor(private view: EditorView) {
				instances.set(view, this);
			}

			destroy() {
				instances.delete(this.view);
				this.endDrag();
			}

			/**
			 * A plain left press on a number arms a drag and takes over the
			 * event: returning `true` (with `preventDefault`) stops CodeMirror
			 * from starting its own mouse-selection for this press, so there is
			 * nothing to race or restore. Any other press (a modifier held, or
			 * `detail > 1` — a double/triple-click) returns `false` and behaves
			 * exactly as CodeMirror's defaults (extend selection, select word).
			 */
			onMouseDown = (event: MouseEvent): boolean => {
				if (event.button !== 0) return false;
				if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false;
				if (event.detail !== 1) return false;
				const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos === null) return false;
				const docText = this.view.state.doc.toString();
				const numbers = draggableNumbersOf(docText, host.sourceMapOf(), currentSlots());
				const number = numberSiteAt(numbers, pos);
				if (number === null) return false;

				this.press++;
				this.armed = {
					number,
					digitStep: stepFromDigit(number.text, pos - number.range.start, event.shiftKey),
					startY: event.clientY,
					pos,
				};
				document.addEventListener("mousemove", this.onMouseMove);
				document.addEventListener("mouseup", this.onMouseUp);
				event.preventDefault();
				this.view.focus();
				return true;
			};

			/** Promotes an armed press to a drag. */
			private startDrag() {
				const armed = this.armed;
				if (armed === null) return;
				this.armed = null;
				const { number } = armed;
				const press = this.press;

				const begin = (slotIndex: number) => {
					if (this.press !== press) return;
					this.dragging = {
						site: number.site,
						slotIndex,
						range: number.range,
						digitStep: armed.digitStep,
						startY: armed.startY,
						startValue: Number.parseFloat(number.text),
					};
					this.view.dom.classList.add(DRAGGING_CLASS);
					this.view.dom.addEventListener("keydown", this.onKeyDown);
				};

				if (number.slotIndex !== null) {
					begin(number.slotIndex);
					return;
				}
				void host.ensureSlotSite(number.site).then(() => {
					const slot = currentSlots().findIndex((decl) => decl.site === number.site);
					if (slot === -1) return;
					begin(slot);
				});
			}

			private onMouseMove = (event: MouseEvent) => {
				if (this.armed !== null) {
					if (Math.abs(this.armed.startY - event.clientY) >= DRAG_THRESHOLD) this.startDrag();
					return;
				}
				const drag = this.dragging;
				if (drag === null) return;
				const pixels = drag.startY - event.clientY;
				const steps = pixels / PIXELS_PER_STEP;
				const value = shapeByUnit(drag.startValue, steps * drag.digitStep, "sig");
				this.coalescer.push(drag.slotIndex, value);
			};

			/** A release with no drag is a plain click: place the caret where the press landed. */
			private onMouseUp = () => {
				this.press++;
				const armed = this.armed;
				this.armed = null;
				document.removeEventListener("mousemove", this.onMouseMove);
				document.removeEventListener("mouseup", this.onMouseUp);
				if (armed !== null) {
					this.view.dispatch({ selection: { anchor: armed.pos } });
					this.view.focus();
				}
				this.endDrag();
			};

			private onKeyDown = (event: KeyboardEvent) => {
				if (event.key !== "Escape" || this.dragging === null) return;
				const drag = this.dragging;
				writeSlot(drag.slotIndex, drag.startValue);
				this.writeDoc(drag.range, drag.startValue);
				this.endDrag();
			};

			private applyWrites(writes: ReadonlyMap<number, number>) {
				const drag = this.dragging;
				if (drag === null) return;
				const value = writes.get(drag.slotIndex);
				if (value === undefined) return;
				writeSlot(drag.slotIndex, value);
				this.writeDoc(drag.range, value);
			}

			private writeDoc(range: { start: number; end: number }, value: number) {
				const docText = this.view.state.doc.toString();
				const change = literalRewrite(docText, range, value);
				this.view.dispatch({
					changes: change,
					annotations: dragEditAnnotation.of(true),
				});
				if (this.dragging !== null) {
					const shift = change.insert.length - (range.end - range.start);
					this.dragging.range = { start: range.start, end: range.end + shift };
				}
			}

			private endDrag() {
				document.removeEventListener("mousemove", this.onMouseMove);
				document.removeEventListener("mouseup", this.onMouseUp);
				if (this.dragging === null) return;
				this.view.dom.classList.remove(DRAGGING_CLASS);
				this.view.dom.removeEventListener("keydown", this.onKeyDown);
				this.dragging = null;
			}
		},
	);
	const handlers = EditorView.domEventHandlers({
		mousedown: (event, view) => instances.get(view)?.onMouseDown(event) ?? false,
	});
	return [plugin, handlers, numberDragTheme];
}

