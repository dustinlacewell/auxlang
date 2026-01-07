import type { Beat } from "../types";

/**
 * Result of parsing an element - can produce multiple beats
 */
export interface ParseResult {
	beats: Beat[];
}
