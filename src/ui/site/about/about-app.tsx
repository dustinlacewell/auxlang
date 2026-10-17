/**
 * About page: what auxlang is, the module language, and how a patch runs.
 * Narrow prose column, no runnable examples — the guide teaches by doing,
 * this page just explains the shape.
 */

import { TextLink } from "@/ui/design/text-link";
import { C, P, Section } from "@/ui/site/prose";
import { SitePage } from "@/ui/site/site-page";

export function AboutApp() {
	return (
		<SitePage current="about">
			<h1 className="text-xl font-bold mb-8">About</h1>

			<Section title="What it is">
				<P>
					Auxlang is music programming in the spirit of Eurorack-style modular synthesis,
					letting you connect oscillators, filters, envelopes, sequencers, and effects by
					chaining method calls together.
				</P>
				<P>
					Patches written in plain JavaScript are compiled to WebAssembly, resulting in speeds up
					to ~80x faster than realtime.
				</P>
				<P>
					Auxlang comes with a variety of modules, and you can write your own — including
					feedback effects — using a DSP-oriented subset of JavaScript.
				</P>
			</Section>

			<Section title="Where to go next">
				<ul className="space-y-2">
					<li className="text-sm">
						<TextLink href="/guide.html" className="font-mono">
							guide
						</TextLink>
						<span className="text-gray-400"> — how to write patches</span>
					</li>
					<li className="text-sm">
						<TextLink href="/modules.html" className="font-mono">
							modules
						</TextLink>
						<span className="text-gray-400"> — oscillators, filters, envelopes, effects, drums</span>
					</li>
					<li className="text-sm">
						<TextLink href="/module-code.html" className="font-mono">
							module code
						</TextLink>
						<span className="text-gray-400"> — the JS rules for writing your own modules</span>
					</li>
				</ul>
			</Section>
		</SitePage>
	);
}
