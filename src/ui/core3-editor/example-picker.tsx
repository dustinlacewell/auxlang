/**
 * Examples dropdown: selecting one loads its source into the editor. Each
 * example teaches one platonic feature (see examples.ts). Styled to match the
 * app's chrome (surface tokens), no bespoke palette.
 */

import { EXAMPLES } from "./examples";

interface ExamplePickerProps {
	onPick: (source: string) => void;
}

export function ExamplePicker({ onPick }: ExamplePickerProps) {
	return (
		<select
			aria-label="Examples"
			defaultValue=""
			onChange={(e) => {
				const ex = EXAMPLES.find((x) => x.name === e.target.value);
				if (ex) onPick(ex.source);
				e.target.value = "";
			}}
			className="bg-surface-700 border border-surface-600 text-gray-300 rounded px-2 py-1 text-sm hover:text-white"
		>
			<option value="" disabled>
				Examples…
			</option>
			{EXAMPLES.map((ex) => (
				<option key={ex.name} value={ex.name}>
					{ex.name}
				</option>
			))}
		</select>
	);
}
