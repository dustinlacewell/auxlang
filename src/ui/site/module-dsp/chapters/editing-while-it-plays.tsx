/**
 * Chapter: re-eval keeps memory — written fields carry, read-only fields
 * rebuild, a resized buffer starts fresh.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function EditingWhileItPlaysChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Editing while it plays">
			<P>
				A module's memory survives a re-eval. A field the tick writes — <C>phase</C> in{" "}
				<C>drone</C> below — carries into the edited code untouched, so the voice keeps playing
				where it was. A field the tick only reads is rebuilt from the new setup, so changing a
				constant takes effect right away.
			</P>
			<P>
				A buffer that comes back at a new size starts the voice fresh — there is no way to carry
				old samples into a differently shaped one. Identity across an edit is the module's name
				and its place in the patch, so editing <C>drone</C>'s body here keeps the same running
				voice:
			</P>
			{ex("liveEdit")}
		</Section>
	);
}
