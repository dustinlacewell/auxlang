/**
 * StateField-based visualization system for stable pattern highlighting.
 * 
 * Simplified architecture:
 * - Active decorations are sent directly with their positions from the runtime
 * - No need to pre-register positions and match IDs
 * - Decorations are created fresh each frame from the active notes/devices
 */

import { type Extension, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";

// ============================================================================
// Types
// ============================================================================

export type DecorationKind = "note" | "modifier" | "container";

export interface ActiveNote {
	from: number;      // Document position (absolute)
	to: number;        // Document position (absolute)
	kind: DecorationKind;
}

export interface ActiveDevice {
	from: number;
	to: number;
	intensity: number;
}

interface VisualizationState {
	activeNotes: ActiveNote[];
	activeDevices: ActiveDevice[];
}

// ============================================================================
// State Effects
// ============================================================================

/** Effect to update active notes with their positions (called per frame) */
export const setActiveNotes = StateEffect.define<ActiveNote[]>();

/** Effect to update active devices with their positions and intensities */
export const setActiveDevices = StateEffect.define<ActiveDevice[]>();

/** Combined update effect for batched per-frame updates */
export const visualizationUpdateEffect = StateEffect.define<{
	activeNotes: ActiveNote[];
	activeDevices: ActiveDevice[];
}>();

// ============================================================================
// Visualization StateField
// ============================================================================

const visualizationField = StateField.define<VisualizationState>({
	create() {
		return {
			activeNotes: [],
			activeDevices: [],
		};
	},

	update(state, tr) {
		let { activeNotes, activeDevices } = state;

		for (const effect of tr.effects) {
			if (effect.is(setActiveNotes)) {
				activeNotes = effect.value;
			}
			if (effect.is(setActiveDevices)) {
				activeDevices = effect.value;
			}
			if (effect.is(visualizationUpdateEffect)) {
				activeNotes = effect.value.activeNotes;
				activeDevices = effect.value.activeDevices;
			}
		}

		return { activeNotes, activeDevices };
	},
});

// ============================================================================
// Computed Decorations (derived from visualization state)
// ============================================================================

const computedDecorations = EditorView.decorations.compute(
	[visualizationField],
	(state) => {
		const viz = state.field(visualizationField);
		const docLength = state.doc.length;

		const ranges: Array<{ from: number; to: number; decoration: Decoration }> = [];

		// Build note decorations with different classes based on kind
		for (const note of viz.activeNotes) {
			if (note.from >= 0 && note.to <= docLength && note.from < note.to) {
				let className: string;
				switch (note.kind) {
					case "modifier":
						className = "seq-modifier-active";
						break;
					case "container":
						className = "seq-container-active";
						break;
					default:
						className = "seq-note-active";
				}
				ranges.push({
					from: note.from,
					to: note.to,
					decoration: Decoration.mark({ class: className }),
				});
			}
		}

		// Build device decorations with intensity
		for (const device of viz.activeDevices) {
			if (device.from >= 0 && device.to <= docLength && device.from < device.to && device.intensity > 0.01) {
				ranges.push({
					from: device.from,
					to: device.to,
					decoration: Decoration.mark({
						class: "device-active",
						attributes: {
							style: `--intensity: ${device.intensity.toFixed(3)}`,
						},
					}),
				});
			}
		}

		// Sort by position (required for DecorationSet)
		ranges.sort((a, b) => a.from - b.from || a.to - b.to);

		return Decoration.set(
			ranges.map(r => r.decoration.range(r.from, r.to)),
			true
		);
	}
);

// ============================================================================
// Extension bundle
// ============================================================================

export const visualizationStateExtension: Extension = [
	visualizationField,
	computedDecorations,
];
