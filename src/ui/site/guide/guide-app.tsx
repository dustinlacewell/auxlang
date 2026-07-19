/**
 * The guide: how to write patches, start to finish. Narrow prose column;
 * every example is a RunBlock over one shared audio host. Reference tables
 * live on the patterns/modules pages — this page teaches the shapes.
 */

import { hasModule } from "@/core3/module/define";
import { TextLink } from "@/ui/design/text-link";
import { ModuleCard } from "@/ui/docs-kit/module-card";
import { ModuleName } from "@/ui/docs-kit/module-name";
import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { RunBlock } from "@/ui/site/run-block";
import { SitePage } from "@/ui/site/site-page";
import { GUIDE_EXAMPLES } from "./examples";

const NOTATION_ROWS = [
	["c3 e3", "sequence"],
	["~", "rest"],
	["[a b]", "subdivide one step"],
	["<a b>", "alternate per cycle"],
	["{a,b}", "stack (polyphony)"],
	["a*2", "repeat within a step"],
	["a!2", "replicate (adds steps)"],
	["a@2", "hold across steps"],
	["a _ b", "tie / legato"],
	["a? / a?.75", "maybe (seeded drop)"],
	["a(3,8) / a(3,8,2)", "euclid, with rotation"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-10">
			<h2 className="text-lg font-medium border-b border-surface-700 pb-1 mb-3 text-gray-100">
				{title}
			</h2>
			{children}
		</section>
	);
}

function P({ children }: { children: React.ReactNode }) {
	return <p className="text-gray-400 leading-relaxed mb-3">{children}</p>;
}

/** Inline code; a bare registered module name upgrades to the live ModuleName. */
function C({ children }: { children: React.ReactNode }) {
	if (typeof children === "string" && hasModule(children)) {
		return (
			<span className="text-[0.9em]">
				<ModuleName name={children} />
			</span>
		);
	}
	return <code className="font-mono text-gray-200 text-[0.9em]">{children}</code>;
}

export function GuideApp() {
	const audio = useSharedAudio();
	const ex = (id: keyof typeof GUIDE_EXAMPLES, opts?: { graphOpen: boolean }) => (
		<RunBlock
			id={`guide::${id}`}
			code={GUIDE_EXAMPLES[id]}
			audio={audio}
			graphOpen={opts?.graphOpen ?? false}
		/>
	);

	return (
		<SitePage current="guide" narrow onStopAll={audio.halt}>
			<h1 className="text-xl font-bold mb-1">Guide</h1>
			<p className="text-sm text-gray-400 mb-8">How to write patches.</p>

			<Section title="Modules">
				<P>
					Auxlang is modular synthesis, kin to Eurorack: there are modules, modules have ports, and
					you patch them together — in JavaScript. <C>sin</C> is a module, an oscillator. <C>out</C>{" "}
					is a module, the speakers.
				</P>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 items-start">
					<ModuleCard name="sin" />
					<ModuleCard name="out" />
				</div>
				<P>
					A module's input ports are set positionally — <C>sin(440)</C> is 440 Hz — by name —{" "}
					<C>{"sin({ freq: 440 })"}</C> — or with a setter — <C>.freq(440)</C>.
				</P>
				<P>
					Chaining is the patch cable: each link routes the previous module's output into the next
					module's default input. Only what reaches <C>out()</C> plays.
				</P>
				{ex("modules", { graphOpen: true })}
			</Section>

			<Section title="Signals">
				<P>
					Ports take signals. The <C>440</C> above is a static signal — it never changes. But an
					input port will just as happily take a changing signal: another module's output.
				</P>
				<P>
					Oscillator positional args are <C>(freq, min, max)</C>, so <C>sin(0.2, 200, 600)</C> is a
					slow sine sweeping 200 to 600. Route it into another oscillator's <C>freq</C> and the
					pitch follows it — a siren:
				</P>
				{ex("signals")}
				<P>
					Every input on every module works this way — filter cutoffs, envelope times, drum tones.
					This is all modulation is.
				</P>
				{ex("routing")}
				<P>
					Output ports beyond the default are read by name: <C>pan</C> has <C>.l</C> and <C>.r</C>,
					the sequencer has <C>.pitch</C>, <C>.gate</C>, <C>.trig</C>. Ports, units, and defaults
					for every module are on the <TextLink href="/modules.html">modules page</TextLink>.
				</P>
			</Section>

			<Section title="Clock and sequencing">
				<P>
					<C>clock(120)</C> at the top sets the tempo; every <C>seq</C> uses it. <C>seq(pattern)</C>{" "}
					has three taps: <C>.pitch</C> (semitones, the default output), <C>.gate</C> (1 while a
					note sounds), and <C>.trig</C> (a one-sample pulse per onset). Chaining an oscillator off
					the seq plays its pitch; multiply by an envelope on the gate to shape notes.
				</P>
				{ex("sequencing")}
			</Section>

			<Section title="Patterns">
				<P>
					<C>seq("...")</C> takes mini-notation. Notes are MIDI names (<C>c4</C> = 60, accidentals{" "}
					<C>#</C> and <C>b</C>); bare numbers are semitones.
				</P>
				<table className="text-sm mb-4 w-full">
					<tbody>
						{NOTATION_ROWS.map(([form, meaning]) => (
							<tr key={form} className="border-t border-surface-700">
								<td className="py-0.5 pr-6 font-mono text-gray-200 whitespace-nowrap">{form}</td>
								<td className="py-0.5 text-gray-400">{meaning}</td>
							</tr>
						))}
					</tbody>
				</table>
				<P>
					<C>p`...`</C> makes a pattern value you can transform: <C>.fast</C>, <C>.slow</C>,{" "}
					<C>.rev</C>, <C>.early</C>, <C>.late</C>, <C>.every</C>, <C>.iter</C>, <C>.ply</C>,{" "}
					<C>.euclid</C>, <C>.degrade</C>, <C>.add</C>, <C>.mul</C>, <C>.off</C>. Templates splice:{" "}
					<C>{"p`${hook} ${hook.rev()}`"}</C>. Randomness (<C>?</C>, <C>.degrade</C>) is seeded —
					same result every run.
				</P>
				{ex("patterns")}
				<P>
					The full grammar and every combinator is on the{" "}
					<TextLink href="/patterns.html">patterns page</TextLink>.
				</P>
			</Section>

			<Section title="Patterns as signals">
				<P>
					Patterns lift into any knob automatically, stepped and sample-and-held — they can drive
					pitch directly: <C>tri(p`48 55 60 63`)</C>. Steps click into a continuous control like
					cutoff; wrap the pattern in <C>slew</C> to glide.
				</P>
				{ex("patternModulation")}
			</Section>

			<Section title="Drums">
				<P>
					Drums fire on triggers: chain <C>kick</C>, <C>snare</C>, <C>hihat</C>, or <C>clap</C> off
					a seq's <C>.trig</C>.
				</P>
				{ex("drums")}
			</Section>

			<Section title="Polyphony">
				<P>
					A <C>{"{c3,e3,g3}"}</C> stack widens the seq to three lanes. The whole chain runs per lane
					— one voice each — and <C>out</C> mixes them down.
				</P>
				{ex("polyphony")}
			</Section>

			<Section title="Stereo">
				<P>
					Mono <C>.out()</C> centers. For placement, <C>pan</C> outputs <C>l</C> and <C>r</C>; wire
					both into <C>out</C>. A bare <C>.out()</C> off a stereo source throws — it would drop a
					channel.
				</P>
				{ex("stereo")}
			</Section>

			<Section title="Feedback">
				<P>
					Cycles are legal through <C>loop</C>: the callback receives the loop's own output one
					sample late. Echoes, filter pinging, Karplus-Strong.
				</P>
				{ex("feedback")}
			</Section>

			<Section title="Custom modules">
				<P>
					<C>defmod(spec)</C> defines a real module for this patch — the same contract the built-ins
					use: <C>ins</C>/<C>outs</C> with unit annotations (<C>sig</C>, <C>hz</C>, <C>unit</C>,
					...), optional <C>state</C>, and a per-sample <C>tick</C> that runs in the audio engine.
					It then chains like any built-in. One rule: <C>tick</C> and <C>state</C> ship to the audio
					thread as source, so they must be closure-free — only their parameters and globals like{" "}
					<C>Math</C>.
				</P>
				{ex("customModules")}
				<P>
					Reusable chain fragments need no registration — they are plain JS functions, used
					call-style or via <C>apply</C>.
				</P>
			</Section>

			<Section title="patstep">
				<P>
					<C>patstep(pattern, trig)</C> steps to the next value on each trigger, ignoring the
					pattern's own timing — an analog step sequencer. Any trigger works: a seq's <C>.trig</C>,
					a comparator on an LFO.
				</P>
				{ex("patstep")}
			</Section>

			<Section title="When it errors">
				<P>
					Everything fails loud at eval time — unknown ports, missing required inputs, notation
					parse errors — naming what was available. Four footguns: <C>sin(0)</C> is frequency 0,
					which is silence (use <C>sin()</C> or <C>{"sin({ pitch: 60 })"}</C>); forgetting{" "}
					<C>clock(...)</C> leaves seqs unclocked; <C>mod</C> is modulo, not modulation; and an
					input the chain already wired can't also be set — <C>{"s.pitch.saw({ freq: 880 })"}</C>{" "}
					throws.
				</P>
			</Section>
		</SitePage>
	);
}
