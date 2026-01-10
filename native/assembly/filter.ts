/**
 * Native filter module for auxlang.
 *
 * Exports a state-variable filter with lowpass, highpass, bandpass, and notch modes.
 *
 * Standard device interface:
 * - init(sampleRate): Initialize the filter
 * - process(input): Process one sample
 * - set_cutoff(value): Set cutoff frequency in Hz
 * - set_resonance(value): Set resonance 0-1
 * - set_mode(value): Set filter mode (0=LP, 1=HP, 2=BP, 3=Notch)
 */

import { SVF } from "./svf";

// Global filter instance
let filter: SVF | null = null;

export function init(sampleRate: f32): void {
	filter = new SVF(sampleRate);
}

export function process(input: f32): f32 {
	if (filter === null) return input;
	return (filter as SVF).process(input);
}

export function set_input(value: f32): void {
	// Input is passed to process(), this is a no-op
	// Required by the device interface but not used
}

export function set_cutoff(value: f32): void {
	if (filter !== null) (filter as SVF).setCutoff(value);
}

export function set_resonance(value: f32): void {
	if (filter !== null) (filter as SVF).setResonance(value);
}

export function set_mode(value: f32): void {
	if (filter !== null) (filter as SVF).setMode(<i32>value);
}

export function clear(): void {
	if (filter !== null) (filter as SVF).clear();
}

// State serialization for live re-eval
// Uses same interface as reverb for consistency
let stateBuffer: StaticArray<f32> | null = null;

export function get_state_size(): i32 {
	return 2; // ic1eq, ic2eq
}

export function alloc_state_buffer(size: i32): usize {
	stateBuffer = new StaticArray<f32>(size);
	return changetype<usize>(stateBuffer);
}

export function serialize_state(): i32 {
	if (filter === null || stateBuffer === null) return 0;
	const buf = stateBuffer as StaticArray<f32>;
	unchecked(buf[0] = (filter as SVF).getIc1eq());
	unchecked(buf[1] = (filter as SVF).getIc2eq());
	return 2;
}

export function deserialize_state(): void {
	if (filter === null || stateBuffer === null) return;
	const buf = stateBuffer as StaticArray<f32>;
	(filter as SVF).setIc1eq(unchecked(buf[0]));
	(filter as SVF).setIc2eq(unchecked(buf[1]));
}
