/**
 * Chapter: outputs are the tick's return value — one value, or a record.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function OutputsChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Outputs">
			<P>
				A tick's return value is its output. Return a plain number and the module has one
				output, named <C>out</C> — the default a chain picks up automatically. Return a record and
				the module has one output per field: <C>{"{ l, r }"}</C> for a stereo module, <C>{"{ lo, hi }"}</C>{" "}
				for the split filter below.
			</P>
			<P>
				A named output beyond <C>out</C> is read off the module handle by name — <C>t.lo</C>,{" "}
				<C>t.hi</C> — the same way a built-in's <C>.gate</C> or <C>.l</C> works.
			</P>
			{ex("outputsRecord")}
		</Section>
	);
}
