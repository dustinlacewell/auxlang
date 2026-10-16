/**
 * Render a new value as text that keeps the original literal's shape: the
 * same decimal places (so a drag on "0.25" writes "0.35", not
 * "0.35000000000000003"), and no decimal point at all for a value that was
 * written as an integer. Never scientific notation for the ranges a drag
 * produces.
 */

export function formatLike(value: number, originalText: string): string {
	const decimals = decimalPlaces(originalText);
	const fixed = value.toFixed(decimals);
	return decimals === 0 ? fixed : trimTrailingZeros(fixed);
}

function decimalPlaces(text: string): number {
	const dot = text.indexOf(".");
	return dot === -1 ? 0 : text.length - dot - 1;
}

/** Drop trailing zeros introduced by `toFixed`, but keep at least one decimal digit. */
function trimTrailingZeros(fixed: string): string {
	const trimmed = fixed.replace(/0+$/, "");
	return trimmed.endsWith(".") ? `${trimmed}0` : trimmed;
}
