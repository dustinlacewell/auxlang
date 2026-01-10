/**
 * Native audio modules for auxlang.
 *
 * This is the main entry point for the WebAssembly module.
 * All exported functions are callable from JavaScript.
 *
 * Standard device interface:
 * - init(sampleRate): Initialize the device
 * - process(input): Process one sample
 * - set_<inputName>(value): Set parameter values
 */

import { Dattorro } from "./dattorro";

// Global reverb instance (created once, reused)
let reverb: Dattorro | null = null;

/**
 * Initialize the reverb with a given sample rate.
 * Must be called before processing.
 */
export function init(sampleRate: f32): void {
	reverb = new Dattorro(sampleRate);
}

/**
 * Process a single mono sample through the reverb.
 * Returns the processed sample.
 */
export function process(input: f32): f32 {
	if (reverb === null) return input;
	return (reverb as Dattorro).processMono(input);
}

/**
 * Set reverb room size (0-1).
 * Larger values = longer reverb tail.
 */
export function set_room(value: f32): void {
	if (reverb !== null) (reverb as Dattorro).setSize(value);
}

/**
 * Set reverb damping (0-1).
 * Higher values = more high-frequency absorption.
 */
export function set_damp(value: f32): void {
	if (reverb !== null) (reverb as Dattorro).setDamping(value);
}

/**
 * Set reverb wet level (0-1).
 * Amount of reverb in the output.
 */
export function set_wet(value: f32): void {
	if (reverb !== null) (reverb as Dattorro).setWet(value);
}

/**
 * Set reverb dry level (0-1).
 * Amount of original signal in the output.
 */
export function set_dry(value: f32): void {
	if (reverb !== null) (reverb as Dattorro).setDry(value);
}

/**
 * Clear the reverb buffers.
 * Call this when stopping playback to avoid leftover reverb tail.
 */
export function clear(): void {
	if (reverb !== null) (reverb as Dattorro).clear();
}

// State serialization for live re-eval
// Shared buffer for state transfer - allocated on first use
let stateBuffer: StaticArray<f32> | null = null;

/**
 * Get the size of state buffer needed (in f32 elements).
 */
export function get_state_size(): i32 {
	if (reverb === null) return 0;
	return (reverb as Dattorro).getStateSize();
}

/**
 * Allocate and return pointer to state buffer.
 * Call get_state_size() first to know the size.
 */
export function alloc_state_buffer(size: i32): usize {
	stateBuffer = new StaticArray<f32>(size);
	return changetype<usize>(stateBuffer);
}

/**
 * Serialize current state into the state buffer.
 * Returns number of f32 values written.
 */
export function serialize_state(): i32 {
	if (reverb === null || stateBuffer === null) return 0;
	return (reverb as Dattorro).serializeState(stateBuffer as StaticArray<f32>);
}

/**
 * Deserialize state from the state buffer.
 */
export function deserialize_state(): void {
	if (reverb === null || stateBuffer === null) return;
	(reverb as Dattorro).deserializeState(stateBuffer as StaticArray<f32>);
}
