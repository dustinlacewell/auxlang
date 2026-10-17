/**
 * Chapter: a first module — the shape of a defmod in one look.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function FirstModuleChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="A first module">
			<P>
				<C>defmod(name, meta, setup)</C> builds a module. <C>setup</C> runs once and returns the{" "}
				<C>tick</C>, the function that runs every sample. Here <C>fold</C> is a wavefolder: one
				line of setup (none needed), one line of tick.
			</P>
			{ex("firstModule", { graphOpen: true })}
			<P>
				<C>defmod</C> returns a factory, so you keep it in a local — <C>const fold = defmod(...)</C>.
				Once it exists it chains like any built-in module, right after the module it folds:
			</P>
			{ex("firstModuleChained")}
		</Section>
	);
}
