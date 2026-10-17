/**
 * Module DSP: a language guide for writing modules, chapter by chapter.
 * Narrow prose column, every example runnable, over one shared audio host —
 * the same shape as the guide page.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { SitePage } from "@/ui/site/site-page";
import { DefpatchChapter } from "./chapters/defpatch";
import { EditingWhileItPlaysChapter } from "./chapters/editing-while-it-plays";
import { FirstModuleChapter } from "./chapters/first-module";
import { HelpersChapter } from "./chapters/helpers";
import { InputsChapter } from "./chapters/inputs";
import { MetaChapter } from "./chapters/meta";
import { OutputsChapter } from "./chapters/outputs";
import { PortGroupsChapter } from "./chapters/port-groups";
import { RandomnessChapter } from "./chapters/randomness";
import { SetupAndMemoryChapter } from "./chapters/setup-and-memory";
import { WhatTheCompilerChecksChapter } from "./chapters/what-the-compiler-checks";
import { WorkingWithDataChapter } from "./chapters/working-with-data";
import { makeExampleRunner } from "./use-example";

export function ModuleDspApp() {
	const audio = useSharedAudio();
	const ex = makeExampleRunner(audio);

	return (
		<SitePage current="module dsp" narrow onStopAll={audio.halt}>
			<h1 className="text-xl font-bold mb-1">Module DSP</h1>
			<p className="text-sm text-gray-400 mb-8">How to write your own modules.</p>

			<FirstModuleChapter ex={ex} />
			<SetupAndMemoryChapter ex={ex} />
			<InputsChapter ex={ex} />
			<OutputsChapter ex={ex} />
			<HelpersChapter ex={ex} />
			<WorkingWithDataChapter ex={ex} />
			<PortGroupsChapter ex={ex} />
			<RandomnessChapter ex={ex} />
			<EditingWhileItPlaysChapter ex={ex} />
			<MetaChapter ex={ex} />
			<DefpatchChapter ex={ex} />
			<WhatTheCompilerChecksChapter ex={ex} />
		</SitePage>
	);
}
