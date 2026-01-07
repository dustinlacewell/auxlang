import { noteToFreq } from "../note-to-freq";
import type { NoteStep } from "../types";

const NOTE_REGEX = /^([a-gA-G])([#b])?([0-9])?$/;

/**
 * Parse a note string into a NoteStep with frequency and duration.
 *
 * @param value - Note string like "c4", "c#3", "db5"
 * @param duration - Duration for the step
 */
export function parseNote(value: string, duration: number): NoteStep {
	const match = value.match(NOTE_REGEX);
	if (!match) {
		throw new Error(`Invalid note format: ${value}`);
	}

	const name = match[1] as string;
	const accidental = (match[2] as "#" | "b" | undefined) ?? null;
	const octave = match[3] ? Number.parseInt(match[3], 10) : 4;

	const freq = noteToFreq(name, accidental, octave);
	return { type: "note", freqs: [freq], dur: duration };
}
