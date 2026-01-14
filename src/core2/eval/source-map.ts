/**
 * Source map - tracks positions of devices in source code.
 * Used to map runtime node IDs back to editor positions for visualization.
 */

export interface SourcePosition {
	start: number;
	end: number;
	line: number;
	column: number;
}

export interface SourceMap {
	readonly positions: Map<string, SourcePosition>;
	readonly source: string;
}

let currentSourceMap: SourceMap | null = null;
let seqCallOrder: SourcePosition[] = [];

export function createSourceMap(source: string): SourceMap {
	return {
		positions: new Map(),
		source,
	};
}

// Map pattern string -> source position for deterministic lookup
let seqPatternPositions: Map<string, SourcePosition> = new Map();

export function setCurrentSourceMap(map: SourceMap | null): void {
	currentSourceMap = map;
	seqPatternPositions = new Map();
	
	if (map) {
		seqCallOrder = [];
		populateSourceMapFromCode(map);
		
		for (const [tempId, position] of map.positions) {
			if (tempId.startsWith("seq-temp-")) {
				seqCallOrder.push(position);
			}
		}
		
		seqCallOrder.sort((a, b) => a.start - b.start);
		
		// Build pattern -> position map for deterministic lookup
		const patterns = findSeqPatterns(map.source);
		for (const { pattern, patternStart, patternEnd } of patterns) {
			// Find the position that matches this pattern's location
			const pos = seqCallOrder.find(p => p.start === patternStart && p.end === patternEnd);
			if (pos) {
				seqPatternPositions.set(pattern, pos);
			}
		}
		
		for (const tempId of Array.from(map.positions.keys())) {
			if (tempId.startsWith("seq-temp-")) {
				map.positions.delete(tempId);
			}
		}
	}
}

export function getCurrentSourceMap(): SourceMap | null {
	return currentSourceMap;
}

export function capturePosition(map: SourceMap, nodeId: string, position: SourcePosition): void {
	map.positions.set(nodeId, position);
}

/**
 * Capture seq position by pattern string lookup (deterministic, order-independent).
 */
export function captureSeqPositionByPattern(nodeId: string, pattern: string): void {
	if (!currentSourceMap) return;
	
	const position = seqPatternPositions.get(pattern);
	if (position) {
		capturePosition(currentSourceMap, nodeId, position);
	}
}

/**
 * Capture seq position by pattern for multiple nodeIds (for poly voices).
 */
export function captureSeqPositionByPatternForAll(nodeIds: string[], pattern: string): void {
	if (!currentSourceMap) return;
	
	const position = seqPatternPositions.get(pattern);
	if (position) {
		for (const nodeId of nodeIds) {
			capturePosition(currentSourceMap, nodeId, position);
		}
	}
}

export function captureCurrentPosition(nodeId: string, start: number, end: number): void {
	if (!currentSourceMap) return;

	const sourceLines = currentSourceMap.source.split("\n");
	let charCount = 0;
	let line = 1;
	let column = 0;

	for (let i = 0; i < sourceLines.length; i++) {
		const lineLength = sourceLines[i]!.length + 1;
		if (charCount + lineLength > start) {
			line = i + 1;
			column = start - charCount;
			break;
		}
		charCount += lineLength;
	}

	const position: SourcePosition = {
		start,
		end,
		line,
		column,
	};

	capturePosition(currentSourceMap, nodeId, position);
}

export interface SeqPatternInfo {
	nodeId: string;
	patternStart: number;
	patternEnd: number;
	pattern: string;
}

/**
 * Find all seq() calls in source code and return their info with deterministic nodeIds.
 * NodeIds are assigned based on order in source: seq1, seq2, etc.
 * This is the single source of truth for nodeId assignment - used by both
 * the editor highlighter and the runtime evaluation.
 */
export function findSeqPatterns(code: string): SeqPatternInfo[] {
	const patterns: SeqPatternInfo[] = [];
	const seqRegex = /\bseq\s*\(\s*["']/g;
	
	let match: RegExpExecArray | null;
	let seqIndex = 0;
	
	while ((match = seqRegex.exec(code)) !== null) {
		const quoteChar = match[0][match[0].length - 1];
		const patternStart = match.index + match[0].length;
		
		let patternEnd = patternStart;
		for (let i = patternStart; i < code.length; i++) {
			if (code[i] === quoteChar && code[i - 1] !== "\\") {
				patternEnd = i;
				break;
			}
		}
		
		seqIndex++;
		patterns.push({
			nodeId: `seq${seqIndex}`,
			patternStart,
			patternEnd,
			pattern: code.slice(patternStart, patternEnd),
		});
	}
	
	return patterns;
}

export function populateSourceMapFromCode(map: SourceMap): void {
	const code = map.source;
	const patterns = findSeqPatterns(code);
	
	for (const { nodeId, patternStart, patternEnd } of patterns) {
		const sourceLines = code.split("\n");
		let charCount = 0;
		let line = 1;
		let column = 0;

		for (let i = 0; i < sourceLines.length; i++) {
			const lineLength = sourceLines[i]!.length + 1;
			if (charCount + lineLength > patternStart) {
				line = i + 1;
				column = patternStart - charCount;
				break;
			}
			charCount += lineLength;
		}

		const tempId = `seq-temp-${patternStart}`;
		const position: SourcePosition = {
			start: patternStart,
			end: patternEnd,
			line,
			column,
		};
		
		map.positions.set(tempId, position);
	}
}
