/**
 * The render helper every chapter uses to drop in a runnable example: looks
 * up the example's source by key and wires it to the page's shared audio
 * host, the same RunBlock idiom the guide page uses.
 */

import type { SharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { RunBlock } from "@/ui/site/run-block";
import { MODULE_DSP_EXAMPLES } from "./examples";

export type ExampleRunner = (
	id: keyof typeof MODULE_DSP_EXAMPLES,
	opts?: { graphOpen: boolean },
) => React.ReactElement;

export function makeExampleRunner(audio: SharedAudio): ExampleRunner {
	return (id, opts) => (
		<RunBlock
			id={`module-dsp::${id}`}
			code={MODULE_DSP_EXAMPLES[id]}
			audio={audio}
			graphOpen={opts?.graphOpen ?? false}
		/>
	);
}
