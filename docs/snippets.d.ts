/**
 * Every runnable code block in README.md, MANIFESTO.md, and docs/user-guide.md
 * lives here as DATA — one entry per block. Both the scratch verifier
 * (src/tests/scratch/docs-snippets.ts) and the vitest mirror
 * (src/tests/core3/bridge/docs-snippets.test.ts) render each through the same
 * eval path the site uses, so a snippet that renders here is a snippet the docs
 * can quote verbatim. If a doc block changes, change it HERE and paste it back;
 * the test is what stops the docs from rotting.
 *
 * `audible: true` snippets must render >0.005 RMS (they make sound); the rest
 * only have to compile+render finite (silent utilities, structural examples).
 */
export interface Snippet {
    /** Stable id; also the label the doc block is keyed by. */
    readonly id: string;
    /** The exact source shown in the docs — the BODY of a patch function. */
    readonly code: string;
    /** True when the block is expected to produce audible output (RMS > 0.005). */
    readonly audible: boolean;
}
export declare const SNIPPETS: readonly Snippet[];
//# sourceMappingURL=snippets.d.ts.map