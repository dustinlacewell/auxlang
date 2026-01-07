interface ErrorDisplayProps {
	message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
	return (
		<div className="mt-2 p-2 bg-accent-red/20 border border-accent-red rounded text-sm text-accent-red">
			{message}
		</div>
	);
}
