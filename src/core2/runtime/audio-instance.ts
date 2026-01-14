/**
 * Core2 audio instance - manages AudioContext and worklet communication.
 */

import type { WorkletMessage, WorkletStereoGraph } from "./worklet-types";
import type { SourceMap, SourcePosition } from "../eval/source-map";
import { findSeqPatterns } from "../eval/source-map";
import { tokenize } from "../devices/seq/tokenize";
import { parseExpr } from "../devices/seq/ast/parse";
import { extractPositionsForBeat } from "../devices/seq/visitors/extract-positions";
import type { NodeMetrics, SequencerMetrics } from "./worklet/graph/visualization-metrics";

// @ts-expect-error - Vite handles ?url imports
import workletUrl from "./worklet/index.ts?url";

export type DecorationKind = "note" | "modifier" | "container";

export interface NoteDecoration {
	nodeId: string;
	noteId: string;
	start: number;
	end: number;
	kind: DecorationKind;
}

export interface AudioInstance {
	context: AudioContext;
	node: AudioWorkletNode;
	sourceMaps: Map<string, SourceMap>;
	visualizationCallbacks: Map<string, Set<VisualizationCallback>>;
	notePositionCallbacks: Map<string, Set<NotePositionCallback>>;
	decorationState: Map<string, Map<SourcePosition, number>>;
	noteDecorations: Map<string, Map<string, NoteDecoration>>; // graphId -> (noteKey -> decoration)
}

export type VisualizationCallback = (positions: Map<SourcePosition, number>, notes?: NoteDecoration[]) => void;

export interface NotePositionInfo {
	id: string;        // "seq1:note0"
	nodeId: string;    // "seq1"
	noteId: string;    // "note0"
	from: number;      // Document position
	to: number;        // Document position
}

export type NotePositionCallback = (positions: NotePositionInfo[]) => void;

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
		visualizationCallbacks: new Map(),
		notePositionCallbacks: new Map(),
		decorationState: new Map(),
		noteDecorations: new Map(),
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

	if (!inst.visualizationCallbacks.has(graphId)) {
		inst.visualizationCallbacks.set(graphId, new Set());
	}

	// Initialize decoration state
	if (!inst.decorationState.has(graphId)) {
		inst.decorationState.set(graphId, new Map());
	}
	
	// Pre-populate beat 0 decorations so first beat shows immediately when callback registers
	const noteDecorations = new Map<string, NoteDecoration>();
	const seqPatterns = findSeqPatterns(sourceMap.source);
	for (const { nodeId, patternStart, pattern } of seqPatterns) {
		try {
			const expr = parseExpr(pattern);
			const positions = extractPositionsForBeat(expr, pattern, 0, 0);
			for (const pos of positions) {
				const noteKey = `${nodeId}:${pos.noteId}`;
				noteDecorations.set(noteKey, {
					nodeId,
					noteId: pos.noteId,
					start: patternStart + pos.start,
					end: patternStart + pos.end,
					kind: (pos.type === "modifier" || pos.type === "container") ? pos.type : "note",
				});
			}
		} catch {
			// Skip patterns that fail to parse
		}
	}
	inst.noteDecorations.set(graphId, noteDecorations);

	// Emit note positions to subscribers
	emitNotePositions(inst, graphId, sourceMap);

	const message: WorkletMessage = { type: "setStereoGraph", stereo, graphId };
	inst.node.port.postMessage(message);
}

export function stopGraph(inst: AudioInstance, graphId: string): void {
	const message: WorkletMessage = { type: "stop", graphId };
	inst.node.port.postMessage(message);

	// Clear decorations visually before cleanup
	const callbacks = inst.visualizationCallbacks.get(graphId);
	if (callbacks) {
		const emptyDecorations = new Map<SourcePosition, number>();
		for (const callback of callbacks) {
			callback(emptyDecorations, []);
		}
	}

	inst.sourceMaps.delete(graphId);
	inst.visualizationCallbacks.delete(graphId);
	inst.notePositionCallbacks.delete(graphId);
	inst.decorationState.delete(graphId);
	inst.noteDecorations.delete(graphId);
}

export function stopAudio(inst: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	inst.node.port.postMessage(message);
}

function setupVisualizationHandler(inst: AudioInstance): void {
	inst.node.port.onmessage = (e: MessageEvent) => {
		if (e.data.type === "visualization") {
			handleVisualizationUpdate(inst, e.data.graphId, e.data);
		} else if (e.data.type === "decorations") {
			handleDecorationUpdate(inst, e.data.graphId, e.data.nodeId, e.data.decorations);
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
	// Clear old audio decorations and add new ones
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
		// Check if this is an audio position (matches a node in sourceMap)
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

	// Legacy sequencer metrics (kept for backward compatibility, but new seq uses decorations)
	for (const [nodeId, metric] of Object.entries(data.sequencers)) {
		const seqPosition = sourceMap.positions.get(nodeId);
		if (seqPosition && metric.isActive && metric.charStart >= 0) {
			const patternStart = seqPosition.start;
			const notePosition: SourcePosition = {
				start: patternStart + metric.charStart,
				end: patternStart + metric.charEnd,
				line: seqPosition.line,
				column: seqPosition.column + metric.charStart,
			};
			decorationState.set(notePosition, 1);
		}
	}

	// Emit merged state with note decorations
	const callbacks = inst.visualizationCallbacks.get(graphId);
	if (callbacks) {
		const noteDecorations = inst.noteDecorations.get(graphId);
		const noteArray = noteDecorations ? Array.from(noteDecorations.values()) : [];
		for (const callback of callbacks) {
			callback(new Map(decorationState), noteArray);
		}
	}
}

function handleDecorationUpdate(
	inst: AudioInstance,
	graphId: string,
	nodeId: string,
	decorations: Array<{ noteId: string; start: number; end: number; type?: string }>
): void {
	const sourceMap = inst.sourceMaps.get(graphId);
	if (!sourceMap) return;

	const nodePosition = sourceMap.positions.get(nodeId);
	if (!nodePosition) return;

	// Get or create note decorations map for this graph
	let noteDecorations = inst.noteDecorations.get(graphId);
	if (!noteDecorations) {
		noteDecorations = new Map();
		inst.noteDecorations.set(graphId, noteDecorations);
	}

	// Clear old decorations from this node
	const keysToDelete: string[] = [];
	for (const [key, dec] of noteDecorations) {
		if (dec.nodeId === nodeId) {
			keysToDelete.push(key);
		}
	}
	for (const key of keysToDelete) {
		noteDecorations.delete(key);
	}

	// Add new decorations with nodeId:noteId keys
	for (const decoration of decorations) {
		const noteKey = `${nodeId}:${decoration.noteId}`;
		const kind = (decoration.type === "modifier" || decoration.type === "container") 
			? decoration.type 
			: "note";
		noteDecorations.set(noteKey, {
			nodeId,
			noteId: decoration.noteId,
			start: nodePosition.start + decoration.start,
			end: nodePosition.start + decoration.end,
			kind: kind as DecorationKind,
		});
	}

	// Emit to callbacks
	const callbacks = inst.visualizationCallbacks.get(graphId);
	if (callbacks) {
		const decorationState = inst.decorationState.get(graphId) || new Map();
		const noteArray = Array.from(noteDecorations.values());
		for (const callback of callbacks) {
			callback(new Map(decorationState), noteArray);
		}
	}
}

export function onVisualizationUpdate(
	inst: AudioInstance,
	graphId: string,
	callback: VisualizationCallback
): () => void {
	let callbacks = inst.visualizationCallbacks.get(graphId);
	if (!callbacks) {
		callbacks = new Set();
		inst.visualizationCallbacks.set(graphId, callbacks);
	}

	callbacks.add(callback);

	// If decoration state already exists, emit immediately to catch first beat
	const decorationState = inst.decorationState.get(graphId);
	const noteDecorations = inst.noteDecorations.get(graphId);
	if (decorationState || noteDecorations) {
		const noteArray = noteDecorations ? Array.from(noteDecorations.values()) : [];
		callback(new Map(decorationState || new Map()), noteArray);
	}

	return () => {
		const callbacks = inst.visualizationCallbacks.get(graphId);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				inst.visualizationCallbacks.delete(graphId);
			}
		}
	};
}

export function onNotePositionsUpdate(
	inst: AudioInstance,
	graphId: string,
	callback: NotePositionCallback
): () => void {
	let callbacks = inst.notePositionCallbacks.get(graphId);
	if (!callbacks) {
		callbacks = new Set();
		inst.notePositionCallbacks.set(graphId, callbacks);
	}

	callbacks.add(callback);

	// If sourceMap already exists, emit positions immediately
	const sourceMap = inst.sourceMaps.get(graphId);
	if (sourceMap) {
		const positions = extractNotePositions(sourceMap);
		callback(positions);
	}

	return () => {
		const callbacks = inst.notePositionCallbacks.get(graphId);
		if (callbacks) {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				inst.notePositionCallbacks.delete(graphId);
			}
		}
	};
}

function emitNotePositions(inst: AudioInstance, graphId: string, sourceMap: SourceMap): void {
	const callbacks = inst.notePositionCallbacks.get(graphId);
	if (!callbacks || callbacks.size === 0) return;

	const positions = extractNotePositions(sourceMap);
	for (const callback of callbacks) {
		callback(positions);
	}
}

function extractNotePositions(sourceMap: SourceMap): NotePositionInfo[] {
	const positions: NotePositionInfo[] = [];
	const code = sourceMap.source;
	
	const seqPatterns = findSeqPatterns(code);
	
	for (const { nodeId, patternStart, pattern } of seqPatterns) {
		try {
			const tokens = tokenize(pattern);
			let noteIndex = 0;
			
			for (const token of tokens) {
				if (token.type === "NOTE" || token.type === "REST") {
					const noteId = `note${noteIndex}`;
					positions.push({
						id: `${nodeId}:${noteId}`,
						nodeId,
						noteId,
						from: patternStart + token.position,
						to: patternStart + token.position + token.value.length,
					});
					noteIndex++;
				}
			}
		} catch (e) {
			// Skip patterns that fail to tokenize
		}
	}
	
	return positions;
}
