/**
 * The core3 interpreter engine, built in one go: the offline host's engine
 * and the reference every backend must match bit for bit. It prepares the
 * program (prepare/prepare-program.ts) against the previous engine's
 * identities, runs every build step (build/engine-build.ts), then continues
 * the previous engine's state and time (live-engine.ts `handOver`).
 */

import type { EngineCtor, EngineState, Program, Registry } from "../types";
import { EngineBuild } from "./build/engine-build";
import { LiveEngine } from "./live-engine";
import { prepareProgram } from "./prepare/prepare-program";

export class Core3Engine extends LiveEngine {
	constructor(program: Program, sampleRate: number, registry: Registry, prev?: EngineState) {
		const prepared = prepareProgram(program, registry, sampleRate, prev?.identities);
		super(new EngineBuild(prepared, registry, prev).finish());
		if (prev !== undefined) this.handOver(prev);
	}
}

export const createEngine: EngineCtor = (program, sampleRate, registry, prev) =>
	new Core3Engine(program, sampleRate, registry, prev);
