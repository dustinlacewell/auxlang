/**
 * Pure background-alpha math for the LED glow (glow-extension.ts): how bright
 * a quantized step reads as CSS, and which decoration class a mark gets.
 * Kept out of the ViewPlugin so the caps are testable with no CodeMirror.
 */

import type { OutputKind } from "./glow-state";

/** Max background alpha for a non-audio glow; audio outputs are always "on", so they cap lower. */
export const MAX_ALPHA = 0.18;
export const MAX_ALPHA_AUDIO = 0.1;

/** The background alpha for a quantized step (0..quantumSteps), capped by kind. Step 0 is always 0. */
export function glowAlpha(step: number, quantumSteps: number, kind: OutputKind): number {
	if (step <= 0) return 0;
	const t = step / quantumSteps;
	const cap = kind === "audio" ? MAX_ALPHA_AUDIO : MAX_ALPHA;
	return t * cap;
}

/** The decoration class for one glow mark; "" (no class beyond the base) at step 0. */
export function glowMarkClass(step: number, kind: OutputKind, sign: -1 | 0 | 1): string {
	if (step <= 0) return "";
	const stepClass = `aux-glow-${kind === "audio" ? "audio-" : ""}${step}`;
	const signClass = sign === 1 ? "aux-glow-pos" : sign === -1 ? "aux-glow-neg" : "";
	return `aux-glow ${stepClass} ${signClass}`.trim();
}
