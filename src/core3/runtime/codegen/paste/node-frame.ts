/**
 * The locals a pasted node keeps across the block. Per node: one local per
 * config field read (loaded before the block) and one per output (loaded
 * from the node's outs record before the block and stored back after it —
 * the record persists between samples and is shared by the lanes, exactly
 * as the call-site form uses it). Per lane: one local per state field the
 * tick names, loaded before the block; each field the tick writes is stored
 * back after it; and one per math cache slot, empty at the block's start and
 * never stored, so caches are not state. Typed arrays and nested objects stay references in their
 * local, so element writes land in the state itself. Field and port names
 * reach the source only as JSON keys.
 */

import { CACHE_INIT } from "../../../module/bind-math/cache-names";
import type { NodeRun } from "../../node-run";
import type { DriverScope } from "../driver-scope";
import { propKey } from "../js-literal";
import type { NameTable } from "../name-table";
import { refuse } from "./not-pasteable";
import type { FieldLocals } from "./paste-context";

export class NodeFrame {
	private readonly outsRecord: string;
	private readonly configRecord: string;
	private readonly outLocals: Map<string, string>;
	private readonly configLocals = new Map<string, string>();

	constructor(
		run: NodeRun,
		private readonly names: NameTable,
		readonly scope: DriverScope,
	) {
		this.outsRecord = scope.bind(names.fresh(), run.outs);
		this.configRecord = scope.bind(names.fresh(), run.config);
		this.outLocals = new Map(run.outPorts.map((port) => [port, names.fresh()]));
	}

	output(port: string): string {
		return this.outLocals.get(port) ?? refuse(`unknown output '${port}'`);
	}

	config(field: string): string {
		let local = this.configLocals.get(field);
		if (local === undefined) {
			local = this.names.fresh();
			this.configLocals.set(field, local);
		}
		return local;
	}

	before(): string[] {
		return [
			...[...this.configLocals].map(([f, l]) => `const ${l} = ${this.configRecord}${propKey(f)};`),
			...[...this.outLocals].map(([p, l]) => `let ${l} = ${this.outsRecord}${propKey(p)};`),
		];
	}

	after(): string[] {
		return [...this.outLocals].map(([p, l]) => `${this.outsRecord}${propKey(p)} = ${l};`);
	}
}

export class LaneFrame implements FieldLocals {
	private readonly stateRecord: string;
	private readonly stateLocals = new Map<string, { local: string; written: boolean }>();
	private readonly cacheLocals = new Map<number, string>();

	constructor(
		private readonly node: NodeFrame,
		state: Record<string, unknown>,
		private readonly inputs: ReadonlyMap<string, string>,
		private readonly names: NameTable,
	) {
		this.stateRecord = node.scope.bind(names.fresh(), state);
	}

	state(field: string, write: boolean): string {
		let entry = this.stateLocals.get(field);
		if (entry === undefined) {
			entry = { local: this.names.fresh(), written: false };
			this.stateLocals.set(field, entry);
		}
		if (write) entry.written = true;
		return entry.local;
	}

	/** The local for math cache slot `slot`: it starts empty each block and is never stored. */
	cache(slot: number): string {
		let local = this.cacheLocals.get(slot);
		if (local === undefined) {
			local = this.names.fresh();
			this.cacheLocals.set(slot, local);
		}
		return local;
	}

	input(port: string): string {
		return this.inputs.get(port) ?? refuse(`unknown input '${port}'`);
	}

	output(port: string): string {
		return this.node.output(port);
	}

	config(field: string): string {
		return this.node.config(field);
	}

	before(): string[] {
		return [
			...[...this.stateLocals].map(
				([f, e]) => `let ${e.local} = ${this.stateRecord}${propKey(f)};`,
			),
			...[...this.cacheLocals.values()].map((l) => `let ${l} = ${CACHE_INIT};`),
		];
	}

	after(): string[] {
		return [...this.stateLocals]
			.filter(([, e]) => e.written)
			.map(([f, e]) => `${this.stateRecord}${propKey(f)} = ${e.local};`);
	}
}
