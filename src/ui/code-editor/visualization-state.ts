/**
 * Two-phase visualization system for stable pattern highlighting.
 *
 * Phase 1: Registration (at eval time)
 * - All pattern elements are registered with CodeMirror as decorations
 * - CodeMirror automatically tracks their positions through document edits
 * - Decorations start invisible
 *
 * Phase 2: Activation (per frame)
 * - Worklet sends only active element IDs (no positions)
 * - We look up registered decorations by ID and make them visible
 * - Positions are always accurate because CodeMirror maintains them
 */

import { type Extension, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";

// ============================================================================
// Types
// ============================================================================

export type ElementKind = "note" | "modifier" | "container";

/** A registered pattern element (created at eval time) */
export interface RegisteredElement {
	id: string;           // Stable ID: "seq1:note0", "seq1:group1"
	from: number;         // Document position (absolute)
	to: number;           // Document position (absolute)
	kind: ElementKind;    // For styling
}

/** Audio device visualization (intensity-based, separate from pattern elements) */
export interface ActiveDevice {
	from: number;
	to: number;
	intensity: number;
}

/** Internal state for the visualization field */
interface VisualizationState {
	/** All registered elements keyed by ID - positions tracked by CodeMirror */
	registered: Map<string, RegisteredElement>;
	/** Currently active element IDs */
	activeIds: Set<string>;
	/** Audio devices with intensity (separate system) */
	activeDevices: ActiveDevice[];
}

// ============================================================================
// State Effects
// ============================================================================

/** Register all pattern elements at eval time */
export const registerElementsEffect = StateEffect.define<RegisteredElement[]>();

/** Clear all registered elements (on stop or new eval) */
export const clearRegisteredEffect = StateEffect.define<void>();

/** Activate specific elements by ID (per frame from worklet) */
export const activateElementsEffect = StateEffect.define<string[]>();

/** Update audio device intensities (per frame) */
export const updateDevicesEffect = StateEffect.define<ActiveDevice[]>();

// ============================================================================
// Visualization StateField
// ============================================================================

const visualizationField = StateField.define<VisualizationState>({
	create() {
		return {
			registered: new Map(),
			activeIds: new Set(),
			activeDevices: [],
		};
	},

	update(state, tr) {
		let { registered, activeIds, activeDevices } = state;
		let changed = false;

		// Handle document changes - update registered element positions
		if (tr.docChanged && registered.size > 0) {
			const newRegistered = new Map<string, RegisteredElement>();
			for (const [id, elem] of registered) {
				// Map positions through document changes
				const newFrom = tr.changes.mapPos(elem.from, 1); // 1 = assoc right
				const newTo = tr.changes.mapPos(elem.to, -1);     // -1 = assoc left

				// Keep element if it still has positive length
				if (newFrom < newTo) {
					newRegistered.set(id, { ...elem, from: newFrom, to: newTo });
				}
			}
			registered = newRegistered;
			changed = true;
		}

		for (const effect of tr.effects) {
			if (effect.is(registerElementsEffect)) {
				// Register new elements (typically at eval)
				const newRegistered = new Map(registered);
				for (const elem of effect.value) {
					newRegistered.set(elem.id, elem);
				}
				registered = newRegistered;
				activeIds = new Set(); // Clear active on new registration
				changed = true;
			}

			if (effect.is(clearRegisteredEffect)) {
				registered = new Map();
				activeIds = new Set();
				activeDevices = [];
				changed = true;
			}

			if (effect.is(activateElementsEffect)) {
				activeIds = new Set(effect.value);
				changed = true;
			}

			if (effect.is(updateDevicesEffect)) {
				activeDevices = effect.value;
				changed = true;
			}
		}

		if (changed) {
			return { registered, activeIds, activeDevices };
		}
		return state;
	},
});

// ============================================================================
// Computed Decorations
// ============================================================================

const computedDecorations = EditorView.decorations.compute(
	[visualizationField],
	(state) => {
		const viz = state.field(visualizationField);
		const docLength = state.doc.length;

		const ranges: Array<{ from: number; to: number; decoration: Decoration }> = [];

		// Build decorations for active pattern elements
		for (const id of viz.activeIds) {
			const elem = viz.registered.get(id);
			if (!elem) continue;
			if (elem.from < 0 || elem.to > docLength || elem.from >= elem.to) continue;

			let className: string;
			switch (elem.kind) {
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
				from: elem.from,
				to: elem.to,
				decoration: Decoration.mark({ class: className }),
			});
		}

		// Build device decorations with intensity
		for (const device of viz.activeDevices) {
			if (device.from < 0 || device.to > docLength || device.from >= device.to) continue;
			if (device.intensity <= 0.01) continue;

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

		// Sort by position (required for DecorationSet)
		ranges.sort((a, b) => a.from - b.from || a.to - b.to);

		return Decoration.set(
			ranges.map((r) => r.decoration.range(r.from, r.to)),
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

// ============================================================================
// Legacy exports for backward compatibility during migration
// ============================================================================

export type DecorationKind = ElementKind;

export interface ActiveNote {
	from: number;
	to: number;
	kind: ElementKind;
}

/** @deprecated Use activateElementsEffect instead */
export const visualizationUpdateEffect = StateEffect.define<{
	activeNotes: ActiveNote[];
	activeDevices: ActiveDevice[];
}>();
