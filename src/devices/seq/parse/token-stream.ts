import type { Token, TokenType } from "../types";
import { countItemsUntil } from "./count-items";

/**
 * Cursor over a token stream with lookahead and consumption utilities.
 */
export class TokenStream {
	private tokens: Token[];
	private position = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	/** Current token (throws if past end) */
	current(): Token {
		const token = this.tokens[this.position];
		if (!token) {
			throw new Error("Unexpected end of input");
		}
		return token;
	}

	/** Check if current token matches type (without consuming) */
	check(type: TokenType): boolean {
		return this.current().type === type;
	}

	/** Consume and return current token */
	advance(): Token {
		const token = this.current();
		this.position++;
		return token;
	}

	/** Consume token of expected type (throws if mismatch) */
	expect(type: TokenType): Token {
		if (!this.check(type)) {
			const token = this.current();
			throw new Error(
				`Expected '${type}' but got '${token.type}' at position ${token.position}`,
			);
		}
		return this.advance();
	}

	/** True if at EOF token */
	isAtEnd(): boolean {
		return this.current().type === "EOF";
	}

	/** Consume NUMBER token and return its integer value */
	parseNumber(): number {
		const token = this.expect("NUMBER");
		return Number.parseInt(token.value, 10);
	}

	/** Count top-level items until terminator (for duration calculation) */
	countItemsUntil(terminator: TokenType): number {
		return countItemsUntil(this.tokens, this.position, terminator);
	}
}
