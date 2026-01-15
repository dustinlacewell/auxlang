/**
 * Generic tag cloud for filtering by a dimension.
 */

interface FilterCloudProps<T> {
	label: string;
	items: T[];
	selected: T | null;
	getKey: (item: T) => string;
	getLabel: (item: T) => string;
	getColor: (item: T) => string;
	onSelect: (item: T | null) => void;
	/** Use smaller styling (for secondary filters like devices) */
	compact?: boolean;
}

export function FilterCloud<T>({
	label,
	items,
	selected,
	getKey,
	getLabel,
	getColor,
	onSelect,
	compact = false,
}: FilterCloudProps<T>) {
	const handleClick = (item: T) => {
		const key = getKey(item);
		const selectedKey = selected ? getKey(selected) : null;

		if (selectedKey === key) {
			onSelect(null);
		} else {
			onSelect(item);
		}
	};

	return (
		<div className={compact ? "mb-4" : "mb-4"}>
			<h3 className="text-sm font-medium text-gray-400 mb-2 text-center">{label}</h3>
			<div className="flex flex-wrap gap-2 justify-center">
				{items.map((item) => {
					const key = getKey(item);
					const selectedKey = selected ? getKey(selected) : null;
					const isActive = selectedKey === null || selectedKey === key;
					const color = getColor(item);

					return (
						<button
							key={key}
							type="button"
							onClick={() => handleClick(item)}
							style={{
								backgroundColor: isActive ? color : undefined,
								borderColor: color,
							}}
							className={
								compact
									? `px-2 py-0.5 rounded text-xs transition-colors border ${
											isActive
												? "text-gray-900 font-medium"
												: "bg-surface-800 text-gray-500 hover:bg-surface-700"
										}`
									: `px-3 py-1 rounded-full text-sm transition-colors border-2 ${
											isActive
												? "text-gray-900 font-medium"
												: "bg-surface-800 text-gray-400 hover:bg-surface-700"
										}`
							}
						>
							{getLabel(item)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
