/**
 * Pitch ↔ frequency. Semitones use MIDI numbering: 69 = A4 = 440 Hz.
 */

export function semisToHz(pitch: number): number {
	return 440 * 2 ** ((pitch - 69) / 12);
}

export function hzToSemis(freq: number): number {
	return 69 + 12 * Math.log2(freq / 440);
}
