import { isDescriptor } from "../descriptor/guards/is-descriptor";
import { isOutputRef } from "../descriptor/guards/is-output-ref";
import { isPoly, type PolyDescriptor } from "../descriptor/poly";
import { getDescriptor, setOutputHandler } from "../descriptor/registry";
import type { AnyDescriptor, Signal } from "../descriptor/types";
import { add } from "../devices/add";
import { gain } from "../devices/gain";
import { reify } from "./reify";
import type { Graph } from "./types";

/** Stereo graph output - separate graphs for left and right channels */
export interface StereoGraph {
	left: Graph;
	right: Graph;
}

/** Collected outputs for the current evaluation */
let collectedOutputs: AnyDescriptor[] = [];

/**
 * Clear collected outputs. Called before evaluating user code.
 */
export function clearOutputs(): void {
	collectedOutputs = [];
}

/**
 * Get collected outputs and build final graph (mono - deprecated).
 * Use collectStereoGraph() for stereo support.
 */
export function collectGraph(): Graph | null {
	if (collectedOutputs.length === 0) {
		return null;
	}

	const mixed = mixVoices(collectedOutputs);
	return reify(mixed);
}

/**
 * Get collected outputs and build stereo graphs.
 * Distributes voices across L/R channels:
 * - 1 voice: mono (same graph for both channels)
 * - 2 voices: voice 0 = left, voice 1 = right
 * - N voices: round-robin (evens = left, odds = right)
 */
export function collectStereoGraph(): StereoGraph | null {
	if (collectedOutputs.length === 0) {
		return null;
	}

	if (collectedOutputs.length === 1) {
		// Mono: same graph for both channels
		const graph = reify(collectedOutputs[0]!);
		return { left: graph, right: graph };
	}

	if (collectedOutputs.length === 2) {
		// Stereo: direct mapping
		return {
			left: reify(collectedOutputs[0]!),
			right: reify(collectedOutputs[1]!),
		};
	}

	// N voices: round-robin distribution
	const leftVoices = collectedOutputs.filter((_, i) => i % 2 === 0);
	const rightVoices = collectedOutputs.filter((_, i) => i % 2 === 1);

	return {
		left: reify(mixVoices(leftVoices)),
		right: reify(mixVoices(rightVoices)),
	};
}

/**
 * Register a signal for output. Can be called multiple times.
 * All registered signals are mixed together when collectGraph() is called.
 *
 * For poly signals, voices are flattened into the output mix.
 */
export function out(signal: Signal | AnyDescriptor | PolyDescriptor): void {
	const descriptors = resolveToDescriptors(signal);
	collectedOutputs.push(...descriptors);
}

/**
 * Internal handler for .out() method chaining.
 * Called by descriptor and poly proxies when .out() is accessed.
 */
function handleOutput(signal: AnyDescriptor | AnyDescriptor[]): void {
	if (Array.isArray(signal)) {
		collectedOutputs.push(...signal);
	} else {
		collectedOutputs.push(signal);
	}
}

// Register the output handler so descriptors and polys can call .out()
setOutputHandler(handleOutput);

/**
 * Resolve a signal to one or more descriptors.
 * Poly signals are flattened to their individual voices.
 */
function resolveToDescriptors(signal: Signal | AnyDescriptor | PolyDescriptor): AnyDescriptor[] {
	if (isPoly(signal)) {
		return signal.voices as AnyDescriptor[];
	}

	if (isDescriptor(signal)) {
		return [signal];
	}

	if (isOutputRef(signal)) {
		const descriptor = getDescriptor(signal.descriptorId);
		if (!descriptor) {
			throw new Error(`Unknown descriptor: ${signal.descriptorId}`);
		}
		return [descriptor];
	}

	throw new Error(`Cannot output constant signal: ${signal}`);
}

/**
 * Mix multiple voices into a single signal with proper level scaling.
 * Uses 1/sqrt(n) scaling to prevent clipping while preserving perceived loudness.
 */
function mixVoices(voices: AnyDescriptor[]): AnyDescriptor {
	if (voices.length === 0) {
		throw new Error("Cannot mix zero voices");
	}
	if (voices.length === 1) {
		return voices[0]!;
	}

	// Scale factor: 1/sqrt(n) prevents clipping while preserving loudness
	const scale = 1 / Math.sqrt(voices.length);

	// Scale each voice, then sum
	const scaled = voices.map((v) => gain(v).level(scale));
	let result = add(scaled[0]!).to(scaled[1]!);
	for (let i = 2; i < scaled.length; i++) {
		result = add(result).to(scaled[i]!);
	}
	return result;
}
