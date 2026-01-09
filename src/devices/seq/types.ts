/**
 * Types for the mini-notation parser and sequencer device.
 */

// ============= Tokens =============

export type TokenType =
	| "NOTE"
	| "REST"
	| "LBRACKET"
	| "RBRACKET"
	| "LANGLE"      // <
	| "RANGLE"      // >
	| "LBRACE"      // {
	| "RBRACE"      // }
	| "LPAREN"      // (
	| "RPAREN"      // )
	| "MULTIPLY"    // *
	| "REPLICATE"   // !
	| "ELONGATE"    // @
	| "GLIDE"       // _
	| "MAYBE"       // ?
	| "NUMBER"      // numeric value
	| "COMMA"       // ,
	| "EOF";

export interface Token {
	readonly type: TokenType;
	readonly value: string;
	readonly position: number;
}

// ============= AST Nodes =============

export interface NoteNode {
	readonly type: "note";
	readonly name: string;
	readonly accidental: "#" | "b" | null;
	readonly octave: number;
}

export interface RestNode {
	readonly type: "rest";
}

export interface GroupNode {
	readonly type: "group";
	readonly children: AstNode[];
}

/** Alternation: <a b c> cycles through children each pattern cycle */
export interface AlternateNode {
	readonly type: "alternate";
	readonly children: AstNode[];
}

/** Euclidean: a(k,n) spreads k hits across n steps */
export interface EuclideanNode {
	readonly type: "euclidean";
	readonly hits: number;
	readonly steps: number;
	readonly child: AstNode;  // What to play on hits
}

/** Multiply: a*n repeats n times within same duration */
export interface MultiplyNode {
	readonly type: "multiply";
	readonly child: AstNode;
	readonly count: number;
}

/** Replicate: a!n expands to n copies (a a a) taking n slots */
export interface ReplicateNode {
	readonly type: "replicate";
	readonly child: AstNode;
	readonly count: number;
}

/** Elongate: a@n holds for n time slots */
export interface ElongateNode {
	readonly type: "elongate";
	readonly child: AstNode;
	readonly count: number;
}

/** Stack: a,b,c plays notes simultaneously (polyphonic) */
export interface StackNode {
	readonly type: "stack";
	readonly children: AstNode[];
}

export type AstNode =
	| NoteNode
	| RestNode
	| GroupNode
	| AlternateNode
	| EuclideanNode
	| MultiplyNode
	| ReplicateNode
	| ElongateNode
	| StackNode;

// ============= Pattern Structure =============

export interface NoteStep {
	readonly type: "note";
	/**
	 * Frequency in Hz. For polyphonic steps (chords), this is an array.
	 * Mono notes have a single-element array.
	 */
	readonly freqs: number[];
	/** Duration within beat (0-1, where 1 = whole beat) */
	readonly dur: number;
	/** Start of a tied sequence - gate holds high, no 80% duty cycle */
	readonly tieStart?: boolean;
	/** Tied note - continuation from previous beat, don't re-trigger gate */
	readonly tie?: boolean;
	/** For alternation: which cycle index this step plays on (undefined = always) */
	readonly cycle?: number;
	/** For alternation: total number of alternates */
	readonly cycleTotal?: number;
	/** Probability of playing (0-1, undefined = always play) */
	readonly prob?: number;
}

export interface RestStep {
	readonly type: "rest";
	/** Duration within beat (0-1, where 1 = whole beat) */
	readonly dur: number;
	/** Tied rest - continuation from previous beat */
	readonly tie?: boolean;
	/** For alternation: which cycle index this step plays on (undefined = always) */
	readonly cycle?: number;
	/** For alternation: total number of alternates */
	readonly cycleTotal?: number;
	/** Probability of playing (0-1, undefined = always play) */
	readonly prob?: number;
}

export type Step = NoteStep | RestStep;

/** A beat contains steps and optional beat-level probability */
export interface Beat {
	readonly steps: Step[];
	/** Beat-level probability (from [group]? or <alt>?) */
	readonly prob?: number;
}

/** Sequence of beats - each beat corresponds to one clock trigger */
export type Pattern = Beat[];
