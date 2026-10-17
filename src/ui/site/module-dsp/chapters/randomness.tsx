/**
 * Chapter: seeded randomness — Math.random() per lane, hashRandom(key).
 */

import { C, P, Section } from "@/ui/site/prose";
import type { ExampleRunner } from "../use-example";

export function RandomnessChapter({ ex }: { ex: ExampleRunner }) {
	return (
		<Section title="Randomness">
			<P>
				<C>Math.random()</C> inside a tick draws from that voice's own seeded stream, so the same
				patch with the same seed sounds the same every time it plays.
			</P>
			{ex("randomness")}
			<P>
				<C>hashRandom(key)</C> gives back the same value every time the same key comes around —
				useful for a value that should hold steady for a stretch, like one step of a held random
				sequence:
			</P>
			{ex("randomnessSeeded")}
		</Section>
	);
}
