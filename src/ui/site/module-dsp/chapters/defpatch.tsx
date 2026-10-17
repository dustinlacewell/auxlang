/**
 * Chapter: defpatch — a module built from a patch, not a tick.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function DefpatchChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="defpatch">
			<P>
				<C>defpatch(name, fn)</C> saves a whole patch — built from other modules, chained the
				ordinary way — as a module with the same inputs and outputs. Reach for it instead of{" "}
				<C>defmod</C> when the module is really a combination of existing modules, not new DSP:
				<C>fn</C>'s parameters name the inputs, and its return value names the outputs, exactly
				like a tick's.
			</P>
			{ex("defpatch")}
		</Section>
	);
}
