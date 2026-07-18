/**
 * The loud error strip: shows an eval/compile error verbatim, or nothing.
 * A live language must never silently no-op — a failed run is visible.
 */

interface ErrorStripProps {
	error: string | null;
}

export function ErrorStrip({ error }: ErrorStripProps) {
	if (!error) return null;
	return (
		<pre className="mt-2 p-3 bg-accent-red/20 border border-accent-red rounded text-xs font-mono text-accent-red whitespace-pre-wrap overflow-auto max-h-40">
			{error}
		</pre>
	);
}
