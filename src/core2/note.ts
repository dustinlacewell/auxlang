import { Note } from "tonal";

type NoteTag = {
	(pitch: string): number;
	(strings: TemplateStringsArray, ...values: unknown[]): number;
};

function buildPitch(strings: TemplateStringsArray, values: unknown[]): string {
	let result = "";
	for (let i = 0; i < strings.length; i++) {
		result += strings[i] ?? "";
		if (i < values.length) {
			result += values[i];
		}
	}
	return result;
}

function toFrequency(pitch: string): number {
	const sanitized = pitch.trim();
	if (sanitized.length === 0) {
		throw new Error("note: empty pitch value");
	}
	const freq = Note.freq(sanitized);
	if (freq === null) {
		throw new Error(`note: invalid pitch "${pitch}"`);
	}
	return typeof freq === "number" ? freq : Number.parseFloat(freq);
}

export const $: NoteTag = ((stringsOrPitch: TemplateStringsArray | string, ...values: unknown[]) => {
	if (typeof stringsOrPitch === "string") {
		return toFrequency(stringsOrPitch);
	}
	const pitch = buildPitch(stringsOrPitch, values);
	return toFrequency(pitch);
}) as NoteTag;
