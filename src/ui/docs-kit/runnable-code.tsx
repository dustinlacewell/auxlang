/**
 * The code block plus its loud error below, in the one arrangement every
 * runnable example uses (RunBlock's prose embeds, DocCard's grid cards).
 * Forwards straight to CodeBlock — this exists only to pair it with
 * ErrorDisplay once instead of at each call site.
 */

import type { SlotDecl } from "@/core3/runtime/live/live-contract";
import type { SourceMap } from "@/core3/source/source-map";
import { CodeBlock } from "@/ui/docs-kit/code-block";
import { ErrorDisplay } from "@/ui/design/error-display";

interface RunnableCodeProps {
	code: string;
	graphOpen?: boolean;
	playing?: boolean;
	onRun?: (code: string) => void;
	onStop?: () => void;
	sourceMap?: SourceMap | undefined;
	liveSlots?: readonly SlotDecl[] | undefined;
	onEnsureSlotSite?: ((site: number) => Promise<void>) | undefined;
	error?: string;
}

export function RunnableCode({ error, ...codeBlockProps }: RunnableCodeProps) {
	return (
		<>
			<CodeBlock {...codeBlockProps} />
			{error && <ErrorDisplay message={error} />}
		</>
	);
}
