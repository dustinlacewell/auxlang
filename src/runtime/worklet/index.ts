/**
 * Worklet entry point.
 *
 * This module is loaded via audioContext.audioWorklet.addModule().
 * It sets up global utilities and registers the graph processor.
 *
 * The poly utilities must be on globalThis BEFORE any process function
 * is hydrated. Since ES module imports run before module body code,
 * we set up poly in the poly.ts module itself (side effect).
 */

// This import has a side-effect: it sets globalThis.poly
import "./poly";

// This import has a side-effect: it sets globalThis.seqTraverse
import "./seq-traverse";

// Now safe to import processor which registers the worklet
import "./processor";
