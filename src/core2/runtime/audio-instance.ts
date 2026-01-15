/**
 * Core2 audio instance - manages AudioContext and worklet communication.
 *
 * Two-phase visualization:
 * 1. At eval: Parse patterns and register ALL elements with the editor
 * 2. Per frame: Worklet sends only active element IDs (no positions)
 */

import type { WorkletMessage, WorkletStereoGraph } from "./worklet-types";
import type { SourceMap, SourcePosition } from "../eval/source-map";
import { findSeqPatterns } from "../eval/source-map";
import { parseExpr } from "../devices/seq/ast/parse";
import { extractAllElements, type PatternElement } from "../devices/seq/visitors/extract-all-elements";
import type { NodeMetrics, SequencerMetrics } from "./worklet/graph/visualization-metrics";

// @ts-expect-error - Vite handles ?url imports
import workletUrl from "./worklet/index.ts?url";

export type ElementKind = "note" | "modifier" | "container";

/** Element registered at eval time (sent to editor for CodeMirror tracking) */
export interface RegisteredElement {
	id: string;          // "seq1:note0", "seq1:group1"
	from: number;        // Absolute document position
	to: number;          // Absolute document position
	kind: ElementKind;
}

export interface AudioInstance {
	context: AudioContext;
	node: AudioWorkletNode;
	sourceMaps: Map<string, SourceMap>;
	/** Callbacks for element registration (at eval) */
	registrationCallbacks: Map<string, Set<RegistrationCallback>>;
	/** Callbacks for activation updates (per frame) */
	activationCallbacks: Map<string, Set<ActivationCallback>>;
	/** Callbacks for device intensity updates (per frame) */
	deviceCallbacks: Map<string, Set<DeviceCallback>>;
	/** Decoration state for audio devices */
	decorationState: Map<string, Map<SourcePosition, number>>;
	/** Registered elements per graph (for late-subscriber catch-up) */
	registeredElements: Map<string, RegisteredElement[]>;
	/** Active element IDs per graph (accumulated from all nodes, deduped) */
	activeElements: Map<string, Set<string>>;
}

/** Called at eval with all registered elements */
export type RegistrationCallback = (elements: RegisteredElement[]) => void;

/** Called per frame with active element IDs */
export type ActivationCallback = (activeIds: string[]) => void;

/** Called per frame with audio device intensities */
export type DeviceCallback = (positions: Map<SourcePosition, number>) => void;

let instance: AudioInstance | null = null;

export async function getAudioInstance(): Promise<AudioInstance> {
	if (instance) {
		return instance;
	}

	const context = new AudioContext();
	await context.audioWorklet.addModule(workletUrl);

	const node = new AudioWorkletNode(context, "core2-processor", {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [2],
	});

	node.connect(context.destination);

	instance = {
		context,
		node,
		sourceMaps: new Map(),
		registrationCallbacks: new Map(),
		activationCallbacks: new Map(),
		deviceCallbacks: new Map(),
		decorationState: new Map(),
		registeredElements: new Map(),
		activeElements: new Map(),
	};

	setupVisualizationHandler(instance);

	return instance;
}

export function sendStereoGraph(
	inst: AudioInstance,
	stereo: WorkletStereoGraph,
	sourceMap: SourceMap,
	graphId: string
): void {
	inst.sourceMaps.set(graphId, sourceMap);

	// Initialize callback sets
	if (!inst.registrationCallbacks.has(graphId)) {
		inst.registrationCallbacks.set(graphId, new Set());
	}
	if (!inst.activationCallbacks.has(graphId)) {
		inst.activationCallbacks.set(graphId, new Set());
	}
	if (!inst.deviceCallbacks.has(graphId)) {
		inst.deviceCallbacks.set(graphId, new Set());
	}

	// Initialize decoration state
	if (!inst.decorationState.has(graphId)) {
		inst.decorationState.set(graphId, new Map());
	}

	// Phase 1: Extract and register ALL pattern elements
	const allElements = extractAllPatternElements(sourceMap);

	// Store for late subscribers
	inst.registeredElements.set(graphId, allElements);

	// Emit to registration callbacks
	const regCallbacks = inst.registrationCallbacks.get(graphId);
	if (regCallbacks) {
		for (const callback of regCallbacks) {
			callback(allElements);
		}
	}

	const message: WorkletMessage = { type: "setStereoGraph", stereo, graphId };
	inst.node.port.postMessage(message);
}

/**
 * Extract ALL highlightable elements from all seq patterns in the source.
 * Element IDs are absolute document positions - globally unique.
 */
function extractAllPatternElements(sourceMap: SourceMap): RegisteredElement[] {
	const elements: RegisteredElement[] = [];
	const seqPatterns = findSeqPatterns(sourceMap.source);

	for (const { patternStart, pattern } of seqPatterns) {
		try {
			const expr = parseExpr(pattern);
			const patternElements = extractAllElements(expr);

			for (const elem of patternElements) {
				const absoluteFrom = patternStart + elem.start;
				const absoluteTo = patternStart + elem.end;
				elements.push({
					id: `${absoluteFrom}:${absoluteTo}`,
					from: absoluteFrom,
					to: absoluteTo,
					kind: elem.kind,
				});
			}
		} catch {
			// Skip patterns that fail to parse
		}
	}

	return elements;
}

export function stopGraph(inst: AudioInstance, graphId: string): void {
	const message: WorkletMessage = { type: "stop", graphId };
	inst.node.port.postMessage(message);

	// Notify callbacks of clear
	const activationCallbacks = inst.activationCallbacks.get(graphId);
	if (activationCallbacks) {
		for (const callback of activationCallbacks) {
			callback([]);
		}
	}

	const deviceCallbacks = inst.deviceCallbacks.get(graphId);
	if (deviceCallbacks) {
		for (const callback of deviceCallbacks) {
			callback(new Map());
		}
	}

	inst.sourceMaps.delete(graphId);
	inst.registrationCallbacks.delete(graphId);
	inst.activationCallbacks.delete(graphId);
	inst.deviceCallbacks.delete(graphId);
	inst.decorationState.delete(graphId);
	inst.registeredElements.delete(graphId);
	inst.activeElements.delete(graphId);
}

export function stopAudio(inst: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	inst.node.port.postMessage(message);
}

function setupVisualizationHandler(inst: AudioInstance): void {
	inst.node.port.onmessage = (e: MessageEvent) => {
		if (e.data.type === "visualization") {
			handleVisualizationUpdate(inst, e.data.graphId, e.data);
		} else if (e.data.type === "activeElements") {
			handleActiveElements(inst, e.data.graphId, e.data.activeIds);
		}
	};
}

function handleVisualizationUpdate(
	inst: AudioInstance,
	graphId: string,
	data: { audio: Record<string, NodeMetrics>; sequencers: Record<string, SequencerMetrics> }
): void {
	const sourceMap = inst.sourceMaps.get(graphId);
	if (!sourceMap) return;

	// Get or create persistent decoration state for this graph
	let decorationState = inst.decorationState.get(graphId);
	if (!decorationState) {
		decorationState = new Map();
		inst.decorationState.set(graphId, decorationState);
	}

	// Update audio device visualizations (these change frequently)
	const audioPositions = new Set<SourcePosition>();
	for (const [nodeId, metric] of Object.entries(data.audio)) {
		const position = sourceMap.positions.get(nodeId);
		if (position) {
			const intensity = Math.min(1, metric.rms);
			if (intensity > 0.01) {
				decorationState.set(position, intensity);
				audioPositions.add(position);
			}
		}
	}

	// Remove audio positions that are no longer active
	for (const [position] of decorationState) {
		let isAudioPosition = false;
		for (const nodePosition of sourceMap.positions.values()) {
			if (position === nodePosition) {
				isAudioPosition = true;
				break;
			}
		}
		if (isAudioPosition && !audioPositions.has(position)) {
			decorationState.delete(position);
		}
	}

	// Emit to device callbacks
	const callbacks = inst.deviceCallbacks.get(graphId);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(new Map(decorationState));
		}
	}
}

/**
 * Handle active elements from worklet.
 * IDs are absolute document positions.
 * Replaces the current active set and notifies callbacks.
 */
function handleActiveElements(
	inst: AudioInstance,
	graphId: string,
	activeIds: string[]
): void {
	// Store for potential late-subscriber catch-up
	inst.activeElements.set(graphId, new Set(activeIds));

	// Notify callbacks
	const callbacks = inst.activationCallbacks.get(graphId);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(activeIds);
		}
	}
}

/**
 * Subscribe to element registration (called at eval time).
 * If elements are already registered, emits immediately (for late subscribers).
 */
export function onRegistration(
	inst: AudioInstance,
	graphId: string,
	callback: RegistrationCallback
): () => void {
	let callbacks = inst.registrationCallbacks.get(graphId);
	if (!callbacks) {
		callbacks = new Set();
		inst.registrationCallbacks.set(graphId, callbacks);
	}

	callbacks.add(callback);

	// Emit immediately if elements already registered (late subscriber catch-up)
	const existingElements = inst.registeredElements.get(graphId);
	if (existingElements && existingElements.length > 0) {
		callback(existingElements);
	}

	return () => {
		const callbacks = inst.registrationCallbacks.get(graphId);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				inst.registrationCallbacks.delete(graphId);
			}
		}
	};
}

/**
 * Subscribe to activation updates (called per frame).
 */
export function onActivation(
	inst: AudioInstance,
	graphId: string,
	callback: ActivationCallback
): () => void {
	let callbacks = inst.activationCallbacks.get(graphId);
	if (!callbacks) {
		callbacks = new Set();
		inst.activationCallbacks.set(graphId, callbacks);
	}

	callbacks.add(callback);

	return () => {
		const callbacks = inst.activationCallbacks.get(graphId);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				inst.activationCallbacks.delete(graphId);
			}
		}
	};
}

/**
 * Subscribe to device intensity updates (called per frame).
 */
export function onDeviceUpdate(
	inst: AudioInstance,
	graphId: string,
	callback: DeviceCallback
): () => void {
	let callbacks = inst.deviceCallbacks.get(graphId);
	if (!callbacks) {
		callbacks = new Set();
		inst.deviceCallbacks.set(graphId, callbacks);
	}

	callbacks.add(callback);

	// Emit current state immediately if available
	const decorationState = inst.decorationState.get(graphId);
	if (decorationState) {
		callback(new Map(decorationState));
	}

	return () => {
		const callbacks = inst.deviceCallbacks.get(graphId);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				inst.deviceCallbacks.delete(graphId);
			}
		}
	};
}

// ============================================================================
// Legacy API for backward compatibility during migration
// ============================================================================

export type DecorationKind = ElementKind;

export interface NoteDecoration {
	nodeId: string;
	noteId: string;
	start: number;
	end: number;
	kind: DecorationKind;
}

export type VisualizationCallback = (positions: Map<SourcePosition, number>, notes?: NoteDecoration[]) => void;

/** @deprecated Use onRegistration, onActivation, and onDeviceUpdate instead */
export function onVisualizationUpdate(
	inst: AudioInstance,
	graphId: string,
	callback: VisualizationCallback
): () => void {
	// This is a compatibility shim - new code should use the new APIs
	const unsubDevice = onDeviceUpdate(inst, graphId, (positions) => {
		callback(positions, []);
	});

	return unsubDevice;
}

export interface NotePositionInfo {
	id: string;
	nodeId: string;
	noteId: string;
	from: number;
	to: number;
}

export type NotePositionCallback = (positions: NotePositionInfo[]) => void;

/** @deprecated Use onRegistration instead */
export function onNotePositionsUpdate(
	inst: AudioInstance,
	graphId: string,
	callback: NotePositionCallback
): () => void {
	return onRegistration(inst, graphId, (elements) => {
		// Legacy format expected nodeId:noteId, but we now use absolute positions
		// The ID is now "from:to" format, so we fake the nodeId/noteId for backwards compat
		const positions = elements.map(elem => {
			return {
				id: elem.id,
				nodeId: "seq",  // Placeholder for backwards compat
				noteId: elem.id,
				from: elem.from,
				to: elem.to,
			};
		});
		callback(positions);
	});
}
