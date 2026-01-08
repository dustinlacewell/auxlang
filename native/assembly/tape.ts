/**
 * Native tape delay module for auxlang.
 *
 * Exports a warm tape-style delay with wow, flutter, saturation, and tone control.
 *
 * Standard device interface:
 * - init(sampleRate): Initialize the delay
 * - process(input): Process one sample
 * - set_time(value): Delay time in seconds (0.001-2.0)
 * - set_feedback(value): Feedback amount 0-0.98
 * - set_mix(value): Dry/wet mix 0-1
 * - set_wow(value): Slow pitch drift 0-1
 * - set_flutter(value): Fast pitch wobble 0-1
 * - set_saturation(value): Tape saturation 0-1
 * - set_tone(value): High-frequency roll-off 0-1 (0=dark, 1=bright)
 * - set_age(value): Tape wear/noise 0-1
 */

import { TapeDelay } from "./tape-delay";

// Global delay instance
let delay: TapeDelay | null = null;

export function init(sampleRate: f32): void {
	delay = new TapeDelay(sampleRate);
}

export function process(input: f32): f32 {
	if (delay === null) return input;
	return (delay as TapeDelay).process(input);
}

export function set_input(value: f32): void {
	// Input is passed to process(), this is a no-op
	// Required by the device interface but not used
}

export function set_time(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setTime(value);
}

export function set_feedback(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setFeedback(value);
}

export function set_mix(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setMix(value);
}

export function set_wow(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setWow(value);
}

export function set_flutter(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setFlutter(value);
}

export function set_saturation(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setSaturation(value);
}

export function set_tone(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setTone(value);
}

export function set_age(value: f32): void {
	if (delay !== null) (delay as TapeDelay).setAge(value);
}

export function clear(): void {
	if (delay !== null) (delay as TapeDelay).clear();
}
