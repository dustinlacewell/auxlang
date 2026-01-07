import type { Token } from "../types";

/**
 * Count weighted slots until a terminator token.
 * Accounts for @n (elongate) modifiers that make items take multiple slots.
 * Does not consume tokens.
 *
 * @param tokens - Token array to scan
 * @param position - Starting position in token array
 * @param terminator - Token type to stop at
 */
export function countItemsUntil(
	tokens: Token[],
	position: number,
	terminator: Token["type"],
): number {
	let slots = 0;
	let depth = 0;
	let lastItemIndex = -1;

	for (let i = position; i < tokens.length; i++) {
		const token = tokens[i];
		if (!token) break;

		// Handle closing brackets first
		if (token.type === "RBRACKET" || token.type === "RANGLE") {
			if (depth === 0) {
				if (token.type === terminator) break;
				break;
			}
			depth--;
			continue;
		}

		// At depth 0, count items and check for elongate modifiers
		if (depth === 0) {
			if (
				token.type === "NOTE" ||
				token.type === "REST" ||
				token.type === "LBRACKET" ||
				token.type === "LANGLE"
			) {
				slots++;
				lastItemIndex = i;
			}

			// Check for @n modifier - adds (n-1) extra slots to the last item
			if (token.type === "ELONGATE" && lastItemIndex !== -1) {
				const nextToken = tokens[i + 1];
				if (nextToken?.type === "NUMBER") {
					const elongateCount = Number.parseInt(nextToken.value, 10);
					slots += elongateCount - 1;
					i++; // Skip the number token
				}
			}
		}

		// Track nesting depth for opening brackets (AFTER counting)
		if (token.type === "LBRACKET" || token.type === "LANGLE") {
			depth++;
		}
	}

	return slots;
}
