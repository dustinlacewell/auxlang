/**
 * Chapter: setup runs once per voice; its locals are memory; config params.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function SetupAndMemoryChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Setup and memory">
			<P>
				Setup runs once per voice, before any sample plays. Whatever it declares — a number, a
				typed array, a record, an array of records — becomes that voice's memory: the tick reads
				and writes it, and it lives on from sample to sample.
			</P>
			<P>
				Setup's own parameters are <C>sr</C> (the sample rate) and config: named keys with a
				default, like <C>shape = "sin"</C>. A patch sets config by name when it calls the module:{" "}
				<C>{'buzz({ pitch: 48, shape: "sqr" })'}</C>.
			</P>
			{ex("setupMemory")}
		</Section>
	);
}
