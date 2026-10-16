/**
 * The DOM for one control widget (slider, knob, toggle, button, xy), built
 * once and reused across updates (ControlWidgetType.eq/toDOM in
 * control-widget-extension.ts) — no React, no per-frame allocation beyond a
 * pointermove's own event. `onMove(slotIndex, value)` is called with the
 * slot's new value, clamped to its SlotDecl range; the caller coalesces it
 * into a write + a doc rewrite.
 *
 * Every widget captures the pointer on pointerdown (`setPointerCapture`) and
 * calls `preventDefault()` so a drag never falls through to a text
 * selection — `controlTheme` also sets `user-select: none` and
 * `touch-action: none` on `.aux-control` so a touch drag doesn't scroll the
 * page either. The knob draws a pointer line from centre to rim at the
 * value's angle; the xy pad draws a puck at (x, y); both redraw on every
 * value change, not just on drag (so a widget reflects an engine-driven
 * value, e.g. the preview eval's init, without needing a drag first).
 */

import type { ControlSlot, ControlWidget } from "./control-sites";

type OnMove = (slotIndex: number, value: number) => void;

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1;
const KNOB_MIN_ANGLE = -135;
const KNOB_MAX_ANGLE = 135;

export function renderControl(widget: ControlWidget, onMove: OnMove): HTMLElement {
	switch (widget.kind) {
		case "slider":
			return renderSlider(widget.slots[0], onMove);
		case "knob":
			return renderKnob(widget.slots[0], onMove);
		case "toggle":
			return renderToggle(widget.slots[0], onMove);
		case "button":
			return renderButton(widget.slots[0], onMove);
		case "xy":
			return renderXY(widget.slots[0], widget.slots[1], onMove);
	}
}

function rangeOf(slot: ControlSlot | undefined): { min: number; max: number } {
	return { min: slot?.decl.min ?? DEFAULT_MIN, max: slot?.decl.max ?? DEFAULT_MAX };
}

function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

/** Pointerdown: prevent the default (text-select/scroll) and capture the pointer to `el`. */
function capture(el: HTMLElement, event: PointerEvent): void {
	event.preventDefault();
	el.setPointerCapture(event.pointerId);
}

/** Knob angle (degrees, -135 at min .. +135 at max) for a value in [min, max]. */
export function knobAngle(value: number, min: number, max: number): number {
	const t = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
	return KNOB_MIN_ANGLE + t * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
}

/** The xy puck's position within the pad, 0..1 each axis, y measured up from the bottom. */
export function xyPuckPosition(
	x: number,
	y: number,
	xRange: { min: number; max: number },
	yRange: { min: number; max: number },
): { left: number; top: number } {
	const tx = xRange.max > xRange.min ? clamp((x - xRange.min) / (xRange.max - xRange.min), 0, 1) : 0;
	const ty = yRange.max > yRange.min ? clamp((y - yRange.min) / (yRange.max - yRange.min), 0, 1) : 0;
	return { left: tx, top: 1 - ty };
}

function renderSlider(slot: ControlSlot | undefined, onMove: OnMove): HTMLElement {
	const el = document.createElement("span");
	el.className = "aux-control aux-control-slider";
	if (slot === undefined) return el;
	const { min, max } = rangeOf(slot);
	const track = document.createElement("span");
	track.className = "aux-control-track";
	el.appendChild(track);

	const setFromY = (clientY: number, rect: DOMRect) => {
		const t = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
		onMove(slot.slotIndex, min + t * (max - min));
	};

	el.addEventListener("pointerdown", (event) => {
		capture(el, event);
		const rect = el.getBoundingClientRect();
		setFromY(event.clientY, rect);
		const onMove_ = (e: PointerEvent) => setFromY(e.clientY, rect);
		const onUp = () => {
			el.removeEventListener("pointermove", onMove_);
			el.removeEventListener("pointerup", onUp);
		};
		el.addEventListener("pointermove", onMove_);
		el.addEventListener("pointerup", onUp);
	});

	return el;
}

function renderKnob(slot: ControlSlot | undefined, onMove: OnMove): HTMLElement {
	const el = document.createElement("span");
	el.className = "aux-control aux-control-knob";
	if (slot === undefined) return el;
	const { min, max } = rangeOf(slot);
	const pointer = document.createElement("span");
	pointer.className = "aux-control-knob-pointer";
	el.appendChild(pointer);

	let value = slot.decl.init;
	const draw = () => {
		pointer.style.transform = `rotate(${knobAngle(value, min, max)}deg)`;
	};
	draw();

	el.addEventListener("pointerdown", (event) => {
		capture(el, event);
		const startY = event.clientY;
		const startValue = value;
		const onMove_ = (e: PointerEvent) => {
			const t = clamp((startY - e.clientY) / 100, -1, 1);
			value = clamp(startValue + t * (max - min), min, max);
			draw();
			onMove(slot.slotIndex, value);
		};
		const onUp = () => {
			el.removeEventListener("pointermove", onMove_);
			el.removeEventListener("pointerup", onUp);
		};
		el.addEventListener("pointermove", onMove_);
		el.addEventListener("pointerup", onUp);
	});

	return el;
}

function renderToggle(slot: ControlSlot | undefined, onMove: OnMove): HTMLElement {
	const el = document.createElement("span");
	el.className = "aux-control aux-control-toggle";
	if (slot === undefined) return el;
	let on = slot.decl.init >= 0.5;
	el.classList.toggle("aux-control-on", on);
	el.addEventListener("pointerdown", (event) => {
		capture(el, event);
		on = !on;
		el.classList.toggle("aux-control-on", on);
		onMove(slot.slotIndex, on ? 1 : 0);
	});
	return el;
}

function renderButton(slot: ControlSlot | undefined, onMove: OnMove): HTMLElement {
	const el = document.createElement("span");
	el.className = "aux-control aux-control-button";
	if (slot === undefined) return el;
	el.addEventListener("pointerdown", (event) => {
		capture(el, event);
		el.classList.add("aux-control-pressed");
		onMove(slot.slotIndex, 1);
	});
	const release = (event: PointerEvent) => {
		if (!el.classList.contains("aux-control-pressed")) return;
		el.classList.remove("aux-control-pressed");
		onMove(slot.slotIndex, 0);
		if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
	};
	el.addEventListener("pointerup", release);
	el.addEventListener("pointercancel", release);
	el.addEventListener("lostpointercapture", release);
	return el;
}

function renderXY(
	xSlot: ControlSlot | undefined,
	ySlot: ControlSlot | undefined,
	onMove: OnMove,
): HTMLElement {
	const el = document.createElement("span");
	el.className = "aux-control aux-control-xy";
	if (xSlot === undefined || ySlot === undefined) return el;
	const xRange = rangeOf(xSlot);
	const yRange = rangeOf(ySlot);
	const puck = document.createElement("span");
	puck.className = "aux-control-xy-puck";
	el.appendChild(puck);

	let x = xSlot.decl.init;
	let y = ySlot.decl.init;
	const draw = () => {
		const { left, top } = xyPuckPosition(x, y, xRange, yRange);
		puck.style.left = `${left * 100}%`;
		puck.style.top = `${top * 100}%`;
	};
	draw();

	const setFromPoint = (clientX: number, clientY: number, rect: DOMRect) => {
		const tx = clamp((clientX - rect.left) / rect.width, 0, 1);
		const ty = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
		x = xRange.min + tx * (xRange.max - xRange.min);
		y = yRange.min + ty * (yRange.max - yRange.min);
		draw();
		onMove(xSlot.slotIndex, x);
		onMove(ySlot.slotIndex, y);
	};

	el.addEventListener("pointerdown", (event) => {
		capture(el, event);
		const rect = el.getBoundingClientRect();
		setFromPoint(event.clientX, event.clientY, rect);
		const onMove_ = (e: PointerEvent) => setFromPoint(e.clientX, e.clientY, rect);
		const onUp = () => {
			el.removeEventListener("pointermove", onMove_);
			el.removeEventListener("pointerup", onUp);
		};
		el.addEventListener("pointermove", onMove_);
		el.addEventListener("pointerup", onUp);
	});

	return el;
}
