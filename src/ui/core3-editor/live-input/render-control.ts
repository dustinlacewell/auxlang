/**
 * The DOM for one control widget (slider, knob, toggle, button, xy), built
 * once and reused across updates (ControlWidgetType.eq/toDOM in
 * control-widget-extension.ts) — no React, no per-frame allocation beyond a
 * pointermove's own event. `onMove(slotIndex, value)` is called with the
 * slot's new value, clamped to its SlotDecl range; the caller coalesces it
 * into a write + a doc rewrite.
 */

import type { ControlSlot, ControlWidget } from "./control-sites";

type OnMove = (slotIndex: number, value: number) => void;

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1;

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
		event.preventDefault();
		el.setPointerCapture(event.pointerId);
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
	let value = slot.decl.init;

	el.addEventListener("pointerdown", (event) => {
		event.preventDefault();
		el.setPointerCapture(event.pointerId);
		const startY = event.clientY;
		const startValue = value;
		const onMove_ = (e: PointerEvent) => {
			const t = clamp((startY - e.clientY) / 100, -1, 1);
			value = clamp(startValue + t * (max - min), min, max);
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
		event.preventDefault();
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
		event.preventDefault();
		el.setPointerCapture(event.pointerId);
		el.classList.add("aux-control-pressed");
		onMove(slot.slotIndex, 1);
	});
	const release = () => {
		el.classList.remove("aux-control-pressed");
		onMove(slot.slotIndex, 0);
	};
	el.addEventListener("pointerup", release);
	el.addEventListener("pointercancel", release);
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
	const { min: xMin, max: xMax } = rangeOf(xSlot);
	const { min: yMin, max: yMax } = rangeOf(ySlot);

	const setFromPoint = (clientX: number, clientY: number, rect: DOMRect) => {
		const tx = clamp((clientX - rect.left) / rect.width, 0, 1);
		const ty = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
		onMove(xSlot.slotIndex, xMin + tx * (xMax - xMin));
		onMove(ySlot.slotIndex, yMin + ty * (yMax - yMin));
	};

	el.addEventListener("pointerdown", (event) => {
		event.preventDefault();
		el.setPointerCapture(event.pointerId);
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
