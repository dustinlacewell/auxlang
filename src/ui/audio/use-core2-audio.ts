/**
 * React hook for core2 audio - manages multiple audio instances for test suite.
 */

import * as api from "@/core2/api";
import { collect } from "@/core2/eval/collect";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { toWorkletStereoGraph } from "@/core2/runtime/to-worklet-graph";
import type { WorkletMessage, WorkletStereoGraph } from "@/core2/runtime/worklet-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "./types";

// @ts-expect-error - Vite handles ?url imports
import workletUrl from "@/core2/runtime/worklet/index.ts?url";

interface AudioInstance {
	context: AudioContext;
	node: AudioWorkletNode;
}

interface InstanceState {
	state: PlaybackState;
	error?: string;
}

async function createAudioInstance(): Promise<AudioInstance> {
	const context = new AudioContext();
	await context.audioWorklet.addModule(workletUrl);

	const node = new AudioWorkletNode(context, "core2-processor", {
		numberOfInputs: 0,
		numberOfOutputs: 1,
		outputChannelCount: [2],
	});

	node.connect(context.destination);
	return { context, node };
}

function sendStereoGraph(inst: AudioInstance, stereo: WorkletStereoGraph): void {
	const message: WorkletMessage = { type: "setStereoGraph", stereo };
	inst.node.port.postMessage(message);
}

function stopInstance(inst: AudioInstance): void {
	const message: WorkletMessage = { type: "stop" };
	inst.node.port.postMessage(message);
	inst.context.close();
}

async function evalToStereo(code: string): Promise<WorkletStereoGraph> {
	reset();
	runCode(code, api);

	const graph = collect();
	const expanded = expandPoly(graph);
	const stereo = compile(expanded);
	return toWorkletStereoGraph(stereo);
}

export function useCore2Audio() {
	const [states, setStates] = useState<Map<string, InstanceState>>(new Map());
	const instancesRef = useRef<Map<string, AudioInstance>>(new Map());

	const play = useCallback(async (id: string, code: string) => {
		try {
			const stereo = await evalToStereo(code);

			// Reuse existing instance for smooth re-evaluation
			let instance = instancesRef.current.get(id);
			if (!instance) {
				instance = await createAudioInstance();
				instancesRef.current.set(id, instance);
			}

			// Resume context if suspended
			if (instance.context.state === "suspended") {
				await instance.context.resume();
			}

			sendStereoGraph(instance, stereo);
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "playing" });
				return next;
			});
		} catch (err) {
			setStates((prev) => {
				const next = new Map(prev);
				next.set(id, { state: "error", error: String(err) });
				return next;
			});
		}
	}, []);

	const stop = useCallback((id: string) => {
		const instance = instancesRef.current.get(id);
		if (instance) {
			stopInstance(instance);
			instancesRef.current.delete(id);
		}
		setStates((prev) => {
			const next = new Map(prev);
			next.set(id, { state: "idle" });
			return next;
		});
	}, []);

	const stopAll = useCallback(() => {
		for (const instance of instancesRef.current.values()) {
			stopInstance(instance);
		}
		instancesRef.current.clear();
		setStates(new Map());
	}, []);

	const getState = useCallback(
		(id: string): InstanceState => {
			return states.get(id) ?? { state: "idle" };
		},
		[states],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			for (const instance of instancesRef.current.values()) {
				stopInstance(instance);
			}
		};
	}, []);

	return { getState, play, stop, stopAll };
}
