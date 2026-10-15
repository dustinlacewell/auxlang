/**
 * The core3 engine, built in one go: the offline host's engine, and the
 * reference the worklet's incremental build must match. It prepares the
 * program (prepare/prepare-program.ts) against the previous engine's
 * identities, runs every build step (build/engine-build.ts), then continues
 * the previous engine's state and time (live-engine.ts `handOver`).
 */

import type { EngineCtor, EngineState, Program, Registry } from "../types";
import { EngineBuild } from "./build/engine-build";
import type { DriverOptions } from "./driver";
import { LiveEngine } from "./live-engine";
import { prepareProgram } from "./prepare/prepare-program";

export type EngineOptions = DriverOptions;

export class Core3Engine extends LiveEngine {
	constructor(
		program: Program,
		sampleRate: number,
		registry: Registry,
		prev?: EngineState,
		options: EngineOptions = {},
	) {
		const prepared = prepareProgram(program, registry, sampleRate, prev?.identities, options);
		super(new EngineBuild(prepared, registry, prev).finish());
		if (prev !== undefined) this.handOver(prev);
	}
}

export const createEngine: EngineCtor = (program, sampleRate, registry, prev) =>
	new Core3Engine(program, sampleRate, registry, prev);
