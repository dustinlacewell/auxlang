/**
 * Runtime query: RuntimePattern + time → per-voice output
 *
 * Given a pattern and current time (beat, phase, cycle), returns
 * cv/gate/trig arrays for all voices.
 */

import type { RuntimePattern, SeqOutput, VoiceEvent } from "./types";

/**
 * Query state maintained across samples for proper edge detection and probability.
 */
export interface QueryState {
	/** Last beat index for edge detection */
	lastBeatIndex: number;
	/** Last phase for edge detection */
	lastPhase: number;
	/** CV per voice (sample-and-hold) */
	cv: number[];
	/** Gate per voice */
	gate: number[];
	/** Probability results cached per event occurrence */
	probCache: Map<string, boolean>;
	/** Last event ID per voice for trig detection */
	lastEventId: (string | null)[];
}

/**
 * Create initial query state for a pattern.
 */
export function createQueryState(voiceCount: number): QueryState {
	return {
		lastBeatIndex: -1,
		lastPhase: 0,
		cv: new Array(voiceCount).fill(0),
		gate: new Array(voiceCount).fill(0),
		probCache: new Map(),
		lastEventId: new Array(voiceCount).fill(null),
	};
}

/**
 * Query the pattern at a given time, returning per-voice output.
 *
 * @param pattern - Evaluated pattern
 * @param beatIndex - Current beat (0-indexed)
 * @param phase - Position within beat (0-1)
 * @param cycle - Current pattern cycle (for alternation)
 * @param state - Mutable query state
 * @returns Per-voice cv/gate/trig arrays
 */
export function query(
	pattern: RuntimePattern,
	beatIndex: number,
	phase: number,
	cycle: number,
	state: QueryState,
): SeqOutput {
	const { voiceCount, events, totalBeats } = pattern;

	// Initialize output arrays
	const cv = [...state.cv];
	const gate = new Array(voiceCount).fill(0) as number[];
	const trig = new Array(voiceCount).fill(0) as number[];

	// Wrap beat index for looping patterns
	const wrappedBeat = beatIndex % totalBeats;
	const absoluteTime = wrappedBeat + phase;

	// Find active event for each voice
	for (let voiceId = 0; voiceId < voiceCount; voiceId++) {
		const voiceEvents = events.filter(e => e.voiceId === voiceId);
		const activeEvent = findActiveEvent(voiceEvents, absoluteTime, cycle);

		if (activeEvent) {
			// Check probability
			const eventId = getEventId(activeEvent, cycle);
			let probPass = true;

			if (activeEvent.prob !== undefined) {
				if (!state.probCache.has(eventId)) {
					probPass = Math.random() < activeEvent.prob;
					state.probCache.set(eventId, probPass);
				} else {
					probPass = state.probCache.get(eventId)!;
				}
			}

			if (probPass) {
				// Update CV (sample-and-hold)
				cv[voiceId] = activeEvent.freq;

				// Calculate gate
				const eventDuration = activeEvent.beatEnd - activeEvent.beatStart;
				const timeInEvent = absoluteTime - activeEvent.beatStart;
				const eventPhase = timeInEvent / eventDuration;

				if (activeEvent.tied) {
					// Tied events: gate stays high for full duration
					gate[voiceId] = 1;
				} else {
					// Normal events: 80% duty cycle
					gate[voiceId] = eventPhase < 0.8 ? 1 : 0;
				}

				// Detect trigger (rising edge of event)
				const lastId = state.lastEventId[voiceId];
				if (lastId !== eventId) {
					trig[voiceId] = 1;
					state.lastEventId[voiceId] = eventId;
				}
			}
		} else {
			// No active event - reset last event ID for proper re-trigger
			state.lastEventId[voiceId] = null;
		}
	}

	// Update state
	state.cv = cv;
	state.gate = gate;
	state.lastBeatIndex = beatIndex;
	state.lastPhase = phase;

	return { cv, gate, trig };
}

/**
 * Find the active event at a given time for a voice.
 */
function findActiveEvent(
	events: VoiceEvent[],
	time: number,
	cycle: number,
): VoiceEvent | null {
	for (const event of events) {
		// Check time range
		if (time < event.beatStart || time >= event.beatEnd) {
			continue;
		}

		// Check cycle (for alternation)
		if (event.cycle !== undefined && event.cycleTotal !== undefined) {
			if (cycle % event.cycleTotal !== event.cycle) {
				continue;
			}
		}

		return event;
	}

	return null;
}

/**
 * Generate unique ID for an event occurrence (for probability caching).
 */
function getEventId(event: VoiceEvent, cycle: number): string {
	// Include cycle in ID so prob re-rolls each pattern cycle
	return `${event.voiceId}:${event.beatStart}:${cycle}`;
}

/**
 * Clear probability cache (call at pattern cycle boundary if desired).
 */
export function clearProbCache(state: QueryState): void {
	state.probCache.clear();
}
