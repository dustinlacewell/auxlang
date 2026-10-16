/**
 * Drag any number (MANIFESTO §5.3, `drag-any-number`): pointer-down on a
 * numeric literal, then a vertical drag steps its value. The grabbed digit
 * sets the step size (step-from-digit.ts); Shift is finer. The first drag of
 * a literal turns it into a live slot (`ensureSlotSite`, a re-eval with that
 * site added) — later drags just `writeSlot` (already coalesced to one
 * message per frame in runtime/audio.ts) and rewrite the literal's text in
 * the doc, batched to one transaction per frame (frame-coalescer.ts, used
 * here only for the doc edit). Esc cancels back to the value the drag
 * started from. The doc edit is annotated `dragEditAnnotation` so the host's
 * change listener can skip re-evaluating for it.
 *
 * PIXELS_PER_STEP: vertical pixels of drag per one unscaled step; the
 * grabbed digit's place value (step-from-digit.ts) then scales that step
 * into the literal's own magnitude. A plain literal carries no port unit
 * (bind-slots.ts: a dragged number's slot has no range), so it shapes
 * through `shapeByUnit`'s plain-additive case.
 */

import { currentSlots, writeSlot } from "@/core3/runtime/audio";
import type { SourceMap } from "@/core3/source/source-map";
import { Annotation, type EditorState, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { numberDragTheme } from "./number-drag-theme";
import { FrameCoalescer } from "./frame-coalescer";
import { literalRewrite } from "./literal-rewrite";
import { draggableNumbersOf, numberSiteAt } from "./number-drag-sites";
import { shapeByUnit } from "./shape-by-unit";
import { stepFromDigit } from "./step-from-digit";

const PIXELS_PER_STEP = 6;

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
			/** The selection/caret when the current drag began; restored if CodeMirror moves it mid-drag. */
			private selectionAtDragStart: EditorState["selection"] | null = null;

			constructor(private view: EditorView) {
				view.dom.addEventListener("pointerdown", this.onPointerDown);
			}

			destroy() {
				this.view.dom.removeEventListener("pointerdown", this.onPointerDown);
				this.endDrag();
			}

			private onPointerDown = (event: PointerEvent) => {
				if (event.button !== 0) return;
				const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos === null) return;
				const docText = this.view.state.doc.toString();
				const numbers = draggableNumbersOf(docText, host.sourceMapOf(), currentSlots());
				const caretInLiteral = pos;
				const number = numberSiteAt(numbers, caretInLiteral);
				if (number === null) return;

				event.preventDefault();
				// CodeMirror's own mousedown handler can still move the selection/caret
				// (preventDefault on pointerdown doesn't always suppress it) — restore
				// the selection the drag started from, every time it changes.
				const selectionBefore = this.view.state.selection;
				const digitIndex = caretInLiteral - number.range.start;
				const digitStep = stepFromDigit(number.text, digitIndex, event.shiftKey);

				const begin = (slotIndex: number) => {
					this.dragging = {
						site: number.site,
						slotIndex,
						range: number.range,
						digitStep,
						startY: event.clientY,
						startValue: Number.parseFloat(number.text),
					};
					this.selectionAtDragStart = selectionBefore;
					this.view.dom.setPointerCapture(event.pointerId);
					this.view.dom.classList.add(DRAGGING_CLASS);
					this.view.dom.addEventListener("pointermove", this.onPointerMove);
					this.view.dom.addEventListener("pointerup", this.onPointerUp);
					this.view.dom.addEventListener("keydown", this.onKeyDown);
					if (!this.view.state.selection.eq(selectionBefore)) {
						this.view.dispatch({ selection: selectionBefore });
					}
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
			};

			private onPointerMove = (event: PointerEvent) => {
				const drag = this.dragging;
				if (drag === null) return;
				const pixels = drag.startY - event.clientY;
				const steps = pixels / PIXELS_PER_STEP;
				const value = shapeByUnit(drag.startValue, steps * drag.digitStep, "sig");
				this.coalescer.push(drag.slotIndex, value);
				// A move is also a chance for CodeMirror's own drag-select to have
				// grabbed the selection; the drag owns the caret until pointerup.
				const anchor = this.selectionAtDragStart;
				if (anchor !== null && !this.view.state.selection.eq(anchor)) {
					this.view.dispatch({ selection: anchor });
				}
			};

			private onPointerUp = () => {
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
				if (this.dragging === null) return;
				this.view.dom.classList.remove(DRAGGING_CLASS);
				this.view.dom.removeEventListener("pointermove", this.onPointerMove);
				this.view.dom.removeEventListener("pointerup", this.onPointerUp);
				this.view.dom.removeEventListener("keydown", this.onKeyDown);
				this.dragging = null;
				this.selectionAtDragStart = null;
			}
		},
	);
	return [plugin, numberDragTheme];
}

