/**
 * Guide 2: one brick at a time, each a short text and a runnable patch that
 * changes one thing from the brick before it. Content lives in bricks.ts;
 * this file only lays bricks out, numbered continuously across chapters.
 */

import { useSharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { P, Section } from "@/ui/site/prose";
import { RunBlock } from "@/ui/site/run-block";
import { SitePage } from "@/ui/site/site-page";
import { CHAPTERS } from "./bricks";
import { inlineCode } from "./inline-code";

export function Guide2App() {
	const audio = useSharedAudio();
	let brickNumber = 0;

	return (
		<SitePage current="guide 2" narrow onStopAll={audio.halt}>
			<h1 className="text-xl font-bold mb-8">Guide 2</h1>

			{CHAPTERS.map((chapter, chapterIndex) => (
				<Section key={chapter.title} title={chapter.title}>
					{chapter.bricks.map((brick, brickIndex) => {
						brickNumber += 1;
						return (
							<div key={brickIndex}>
								<P>
									<span className="text-gray-500 mr-1">{brickNumber}.</span>
									{inlineCode(brick.text)}
								</P>
								<RunBlock
									id={`guide2::${chapterIndex}-${brickIndex}`}
									code={brick.code}
									audio={audio}
									graphOpen={brick.graph === true}
								/>
							</div>
						);
					})}
				</Section>
			))}
		</SitePage>
	);
}
