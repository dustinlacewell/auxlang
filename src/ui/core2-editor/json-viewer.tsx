/**
 * Simple JSON viewer with syntax highlighting.
 */

interface JsonViewerProps {
	data: unknown;
	className?: string;
}

export function JsonViewer({ data, className = "" }: JsonViewerProps) {
	const json = JSON.stringify(data, null, 2);

	return (
		<pre className={`bg-surface-900 p-4 rounded overflow-auto text-sm font-mono text-surface-200 ${className}`}>
			{json}
		</pre>
	);
}
