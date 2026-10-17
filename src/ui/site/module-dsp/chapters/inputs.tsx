/**
 * Chapter: tick params name the inputs; defaults, units, range.
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function InputsChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Inputs">
			<P>
				The tick's parameters name its inputs. <C>in</C> is the default input — the one a chain
				feeds. A default sets the value when nothing is plugged in, and it can carry a unit tag:{" "}
				<C>time = secs(0.25)</C> says this port's numbers are seconds. <C>hz()</C>, <C>semis()</C>,
				and <C>beats()</C> tag the other units.
			</P>
			<P>
				<C>range(def, min, max)</C> gives a knob its travel, so a dragged number stops at the ends
				and the module page shows them. A signal plugged into the port still passes through
				whole — the module itself clamps what has to stay in bounds.
			</P>
			{ex("inputsUnits")}
		</Section>
	);
}
