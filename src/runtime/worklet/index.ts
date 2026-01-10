/**
 * Worklet entry point.
 *
 * This module is loaded via audioContext.audioWorklet.addModule().
 * It sets up global utilities and registers the graph processor.
 */

// This import has a side-effect: it sets globalThis.seqTraverse
import "./seq-traverse";

// Now safe to import processor which registers the worklet
import "./processor";
