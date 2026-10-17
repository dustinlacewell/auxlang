/**
 * Renders a page's chapters of bricks: one Section per chapter, each brick a
 * numbered line of text (continuous across chapters) and a runnable patch.
 */

import type { SharedAudio } from "@/ui/docs-kit/use-shared-audio";
import { P, Section } from "@/ui/site/prose";
import { RunBlock } from "@/ui/site/run-block";
import type { Chapter } from "./types";
import { inlineCode } from "./inline-code";

export function BrickChapters({
	chapters,
	idPrefix,
	audio,
}: {
	chapters: readonly Chapter[];
	idPrefix: string;
	audio: SharedAudio;
}) {
	let brickNumber = 0;

	return (
		<>
			{chapters.map((chapter, chapterIndex) => (
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
									id={`${idPrefix}::${chapterIndex}-${brickIndex}`}
									code={brick.code}
									audio={audio}
									graphOpen={brick.graph === true}
								/>
							</div>
						);
					})}
				</Section>
			))}
		</>
	);
}
