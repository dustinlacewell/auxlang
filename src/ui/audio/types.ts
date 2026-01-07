export interface AudioInstance {
	ctx: AudioContext;
	node: AudioWorkletNode;
}

export type PlaybackState = "idle" | "playing" | "error";
