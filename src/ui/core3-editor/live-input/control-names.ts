/**
 * The control modules (core3/modules/lib/controls.js): calls whose control
 * ports always bind to a live slot, independent of `slotSites`
 * (compile/bind-slots.ts). Each entry names which positional argument index
 * holds that control's value literal, so a widget can rewrite the code when
 * it moves one. `null` = no literal to rewrite (button has no positional
 * args; it is a momentary press).
 */

export type ControlKind = "slider" | "knob" | "toggle" | "button" | "xy";

export const CONTROL_VALUE_ARG: Readonly<Record<ControlKind, readonly (number | null)[]>> = {
	slider: [0],
	knob: [0],
	toggle: [0],
	button: [],
	xy: [0, 1],
};

export function controlKindOf(callee: string | null): ControlKind | null {
	return callee !== null && callee in CONTROL_VALUE_ARG ? (callee as ControlKind) : null;
}
