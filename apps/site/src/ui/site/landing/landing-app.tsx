/**
 * The front page: what auxlang is, the hello patch (runnable), and where to go
 * next. Narrow prose column, no card chrome — the quietest page on the site.
 */

import { TextLink } from "@/ui/design/text-link";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { fourChordsExample } from "@/ui/editor/examples/four-chords";
import { P } from "@/ui/site/prose";
import { RunBlock } from "@/ui/site/run-block";
import { SitePage } from "@/ui/site/site-page";

const NEXT_STEPS = [
	{ href: "/editor.html", label: "editor", blurb: "edit a patch while it plays" },
	{ href: "/guide.html", label: "guide", blurb: "how to write patches" },
	{ href: "/patterns.html", label: "patterns", blurb: "every notation form and combinator" },
	{
		href: "/modules.html",
		label: "modules",
		blurb: "oscillators, filters, envelopes, effects, drums",
	},
	{ href: "/module-dsp.html", label: "module dsp", blurb: "write your own modules" },
] as const;

export function LandingApp() {
	const audio = useSharedAudio();

	return (
		<SitePage current="home" narrow onStopAll={audio.halt}>
			<div className="pt-8">
				<h1 className="flex items-center gap-3 font-mono text-4xl font-bold mb-2">
						<img src="/logo.svg" alt="" className="h-11 w-11" />
						auxlang
					</h1>
				<p className="text-lg text-gray-300 mb-6">Text-based modular synthesis.</p>

				<RunBlock id="landing::hello" code={fourChordsExample.source} audio={audio} />

				<div style={{
					color: "#aaa",
					textAlign: "right",
					width: "100%",
					fontSize: ".6em"
				}}>
					Hold <code>ctrl</code> over module names for more info.
				</div>

				<div className="mt-10">
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
				</div>

				<ul className="mt-6 space-y-2">
					{NEXT_STEPS.map((step) => (
						<li key={step.label} className="text-sm">
							<TextLink href={step.href} className="font-mono">
								{step.label}
							</TextLink>
							<span className="text-gray-400"> — {step.blurb}</span>
						</li>
					))}
				</ul>
			</div>
		</SitePage>
	);
}
